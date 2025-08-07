import MobileLayout from "@/components/layout/MobileLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

export default function Profile() {
  const { data: timeLogs = [] } = useQuery<any[]>({ queryKey: ["timeLogs"], initialData: [] });
  const { data: profile = { language: "en" } } = useQuery<{ language: string }>({ queryKey: ["profile"], initialData: { language: "en" } });

  const hours = (sinceDays: number) => {
    const since = Date.now() - sinceDays * 24 * 60 * 60 * 1000;
    const ms = timeLogs
      .filter((l: any) => l.stoppedAt > since && ["submitted", "approved"].includes(l.status))
      .reduce((acc: number, l: any) => acc + (l.stoppedAt - l.startedAt), 0);
    return (ms / 3600000).toFixed(1);
  };

  return (
    <MobileLayout title="Profile">
      <SEO title="Profile" description="Hours summary and preferences" path="/profile" />

      <section className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>My hours</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">This week</div>
              <div className="text-xl font-semibold">{hours(7)} h</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">This month</div>
              <div className="text-xl font-semibold">{hours(30)} h</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-1">
              <label className="text-sm">Language</label>
              <Select defaultValue={profile.language} onValueChange={(v) => localStorage.setItem("bb_language", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </section>
    </MobileLayout>
  );
}
