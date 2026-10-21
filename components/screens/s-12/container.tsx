"use client";

// S-12 Settings (/admin/settings): the approved Stitch page, built with the app's UI kit.
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Clock3, Layers3, Mail, RefreshCw } from "lucide-react";
import { getParkingSettings, updateParkingSettings } from "@/lib/api/client";
import type { ParkingSettings } from "@/lib/api/client.schemas";
import { getAccessToken } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Notice, NoticeDescription, NoticeTitle } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { useNav } from "@/lib/nav";

const loadError = "We couldn't load settings. Try again.";
const sampleSettings: ParkingSettings = {
  dailyReleaseTime: "08:00",
  areas: [{ name: "Floor 1" }, { name: "Floor 2" }, { name: "Floor 3" }],
  reportRecipients: ["usman.tariq@folio3.com", "mariam.farooq@folio3.com"],
};

function inFixture(fixture: string | undefined, phrase: string): boolean {
  return fixture?.toLowerCase().includes(phrase) ?? false;
}

function SettingsSkeleton() {
  return (
    <div aria-label="Loading settings" className="space-y-6" role="status">
      {[0, 1, 2].map((section) => (
        <section className="space-y-4 border-t py-6" key={section}>
          <Skeleton className="h-5 w-40" />
          {section === 0 ? <Skeleton className="h-11 w-56" /> : <Skeleton className="h-40 w-full" />}
        </section>
      ))}
    </div>
  );
}

export function SettingsContainer({ fixture }: { fixture?: string }) {
  const isFixture = fixture !== undefined;
  const fixtureLoading = inFixture(fixture, "loading");
  const fixtureError = inFixture(fixture, "error");
  const fixtureSaved = inFixture(fixture, "saved");
  const fixtureValidation = inFixture(fixture, "validation");
  const [settings, setSettings] = useState<ParkingSettings>(() => isFixture ? sampleSettings : { dailyReleaseTime: "", areas: [], reportRecipients: [] });
  const [newRecipient, setNewRecipient] = useState("");
  const [loading, setLoading] = useState(!isFixture || fixtureLoading);
  const [retrying, setRetrying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState(fixtureError ? loadError : "");
  const [refusal, setRefusal] = useState("");
  const [savedMessage, setSavedMessage] = useState(fixtureSaved ? "Settings saved." : "");
  const [timeError, setTimeError] = useState(fixtureValidation ? "Enter a time such as 09:30" : "");
  const [emailError, setEmailError] = useState(fixtureValidation ? "Enter a valid email" : "");
  const [fixtureResolved, setFixtureResolved] = useState(false);
  const releaseTimeId = useId();
  const newRecipientId = useId();
  const requestId = useRef(0);
  const { go } = useNav();
  const navigate = useRef(go);
  navigate.current = go;

  const loadSettings = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true);
    setPageError("");
    setRefusal("");
    try {
      const token = getAccessToken();
      const options = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
      const response = await getParkingSettings(options);
      if (request !== requestId.current) return;
      if (response.status === 200) {
        setSettings(response.data);
      } else if (response.status === 401) {
        navigate.current("/sign-in");
      } else {
        setRefusal(response.data.message);
      }
    } catch {
      if (request === requestId.current) setPageError(loadError);
    } finally {
      if (request === requestId.current) {
        setLoading(false);
        setRetrying(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isFixture) return;
    void loadSettings();
  }, [isFixture, loadSettings]);

  const updateSettings = (update: Partial<ParkingSettings>) => {
    setSettings((current) => ({ ...current, ...update }));
    setSavedMessage("");
    setRefusal("");
  };

  const retry = () => {
    if (isFixture) {
      setPageError("");
      setSettings(sampleSettings);
      setFixtureResolved(true);
      setLoading(false);
      setRetrying(false);
      return;
    }
    setRetrying(true);
    void loadSettings();
  };

  const addArea = () => updateSettings({ areas: [...settings.areas, { name: "" }] });

  const addRecipient = () => {
    const email = newRecipient.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Enter a valid email");
      return;
    }
    updateSettings({ reportRecipients: [...settings.reportRecipients, email] });
    setNewRecipient("");
    setEmailError("");
  };

  const saveSettings = async () => {
    const validTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(settings.dailyReleaseTime.trim());
    const validEmail = !newRecipient.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newRecipient.trim());
    setTimeError(validTime ? "" : "Enter a time such as 09:30");
    setEmailError(validEmail ? "" : "Enter a valid email");
    if (!validTime || !validEmail) return;

    setSavedMessage("");
    setRefusal("");
    if (isFixture) {
      setSavedMessage("Settings saved.");
      setFixtureResolved(true);
      return;
    }

    setSaving(true);
    try {
      const token = getAccessToken();
      const options = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
      const response = await updateParkingSettings(settings, options);
      if (response.status === 200) {
        setSettings(response.data);
        setSavedMessage("Settings saved.");
      } else if (response.status === 401) {
        navigate.current("/sign-in");
      } else {
        setRefusal(response.data.message);
      }
    } catch {
      setRefusal("We couldn't save settings. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const screenState = fixtureResolved ? "default" : fixture ?? (loading ? "loading" : pageError ? "error" : savedMessage ? "saved" : "default");

  return (
    <main data-screen="S-12" data-state={screenState} className="mx-auto w-full max-w-3xl flex-1 px-4 pb-12 pt-8 sm:px-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Settings</h1>
        <div className="flex items-center gap-4">
          {savedMessage && <span className="text-sm font-medium text-success" role="status">{savedMessage}</span>}
          <Button className="h-11 px-6" disabled={saving || loading} onClick={() => void saveSettings()}>
            {saving ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </header>

      {pageError ? (
        <Notice tone="bad">
          <RefreshCw aria-hidden="true" />
          <NoticeTitle>{pageError}</NoticeTitle>
          <NoticeDescription><Button variant="outline" size="sm" disabled={retrying} onClick={retry}>{retrying ? "Retrying…" : "Retry"}</Button></NoticeDescription>
        </Notice>
      ) : loading ? <SettingsSkeleton /> : (
        <div className="divide-y">
          <section className="space-y-4 border-t py-6">
            <div className="flex items-center gap-2.5">
              <Clock3 aria-hidden="true" className="size-4 text-muted-foreground" />
              <h2 className="font-heading text-base font-semibold">Daily release time</h2>
            </div>
            <div className="space-y-2">
              <div className="w-full sm:w-56">
                <Input
                  id={releaseTimeId}
                  aria-label="Daily release time"
                  aria-invalid={Boolean(timeError)}
                  className="h-11 font-mono"
                  value={settings.dailyReleaseTime}
                  onChange={(event) => {
                    updateSettings({ dailyReleaseTime: event.target.value });
                    setTimeError("");
                  }}
                />
                {timeError && <p className="text-sm text-destructive">{timeError}</p>}
              </div>
              <p className="text-sm leading-normal text-muted-foreground">Released spaces can be claimed from this time each day, Karachi time (PKT).</p>
            </div>
          </section>

          <section className="space-y-4 py-6">
            <div className="flex items-center gap-2.5">
              <Layers3 aria-hidden="true" className="size-4 text-muted-foreground" />
              <h2 className="font-heading text-base font-semibold">Parking areas</h2>
            </div>
            <div className="overflow-hidden rounded-lg border bg-card">
              {settings.areas.map((area, index) => (
                <div className="flex min-h-12 items-center border-b px-4 py-1 last:border-b-0" key={`${index}-${area.name}`}>
                  <Input
                    aria-label={`Parking area ${index + 1}`}
                    className="h-9 font-medium"
                    value={area.name}
                    onChange={(event) => {
                      const areas = settings.areas.map((item, areaIndex) => areaIndex === index ? { ...item, name: event.target.value } : item);
                      updateSettings({ areas });
                    }}
                  />
                </div>
              ))}
            </div>
            <Button variant="link" className="h-auto p-0 text-sm" onClick={addArea}>+ Add an area</Button>
          </section>

          <section className="space-y-4 py-6">
            <div className="flex items-center gap-2.5">
              <Mail aria-hidden="true" className="size-4 text-muted-foreground" />
              <h2 className="font-heading text-base font-semibold">Report recipients</h2>
            </div>
            <div className="overflow-hidden rounded-lg border bg-card">
              {settings.reportRecipients.map((recipient, index) => (
                <div className="flex min-h-12 items-center gap-3 border-b px-4 py-2 last:border-b-0" key={`${index}-${recipient}`}>
                  <Input
                    aria-label={`Report recipient ${index + 1}`}
                    aria-invalid={Boolean(emailError)}
                    className="h-9 min-w-0 border-0 px-0 font-mono shadow-none focus-visible:ring-0"
                    value={recipient}
                    onChange={(event) => {
                      const reportRecipients = settings.reportRecipients.map((item, recipientIndex) => recipientIndex === index ? event.target.value : item);
                      updateSettings({ reportRecipients });
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-muted-foreground"
                    onClick={() => updateSettings({ reportRecipients: settings.reportRecipients.filter((_, recipientIndex) => recipientIndex !== index) })}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Input
                  id={newRecipientId}
                  aria-label="Add report recipient"
                  aria-invalid={Boolean(emailError)}
                  className="h-11 font-mono sm:max-w-sm"
                  type="email"
                  value={newRecipient}
                  onChange={(event) => {
                    setNewRecipient(event.target.value);
                    setEmailError("");
                  }}
                />
                <Button variant="outline" className="h-11" onClick={addRecipient}>Add</Button>
              </div>
              {emailError && <p className="text-sm text-destructive">{emailError}</p>}
            </div>
          </section>
          {refusal && <Notice tone="bad"><NoticeTitle>{refusal}</NoticeTitle></Notice>}
        </div>
      )}
    </main>
  );
}
