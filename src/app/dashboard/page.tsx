"use client";
import {useEffect, useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {supabase} from "@/lib/supabase";
type ActivityItem = {
  id: string;
  type: "journal" | "gym";
  title: string;
  created_at: string;
  user_id: string;
  display_name: string;
  photo_url?: string | null;
};
type Profile = {
  id: string;
  display_name: string;
}
export default function DashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [journalToday, setJournalToday] = useState(0);
    const [gymThisWeek, setGymThisWeek] = useState(0);
    const [weeklyPoints, setWeeklyPoints] = useState(0);
    const [allTimePoints, setAllTimePoints] = useState(0);
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const USER_COLORS: Record<string, string> = {
      "07eeec74-2e18-4d16-8aa6-a77b3b6fccc1":
        "bg-purple-900 border-purple-600",
      "be3982d4-d465-4bb8-a13a-2a15d0ea8402":
        "bg-green-900 border-green-600",
    };
    
    useEffect(() => {
        checkUser();
        loadDashboard();
    }, []);

    async function checkUser() {
        const {data: {
                session
            }} = await supabase.auth.getSession();
        if (!session) {
            router.replace("/");
        }
    }

    async function signOut() {
      await supabase.auth.signOut();
      router.replace("/");
    }

    function getDisplayName(userId: string) {
      return (
        profiles.find((p) => p.id === userId)
          ?.display_name ?? "Unknown User"
      );
    }

    function getUserCardClass(userId?: string) {
      return USER_COLORS[userId as keyof typeof USER_COLORS]
        ?? "bg-gray-100 border-gray-300";
    }
    
    async function loadDashboard() {
      setLoading(true);

      const today = new Date();


      const todayString =
        today.toISOString().split("T")[0];

      const startOfWeek = new Date(today);

      startOfWeek.setDate(
        today.getDate() - today.getDay()
      );

      const weekString =
        startOfWeek.toISOString().split("T")[0];

      const [
        journalTodayResult,
        gymWeekResult,
        allJournalResult,
        allGymResult,
        profilesResult,
        recentJournalResult,
        recentGymResult,
      ] = await Promise.all([
        supabase
          .from("journal_entries")
          .select("id")
          .eq("entry_date", todayString),

        supabase
          .from("gym_sessions")
          .select("id")
          .gte("session_date", weekString),

        supabase
          .from("journal_entries")
          .select("id"),

        supabase
          .from("gym_sessions")
          .select("id"),

        supabase
          .from("profiles")
          .select("*"),

        supabase
          .from("journal_entries")
          .select("id,title,content,created_at,user_id")
          .order("created_at", {
            ascending: false,
          })
          .limit(10),

        supabase
          .from("gym_sessions")
          .select("id,notes,photo_url,created_at,user_id")
          .order("created_at", {
            ascending: false,
          })
          .limit(10),
      ]);

      setProfiles(profilesResult.data ?? []);

      const todayJournalCount =
        journalTodayResult.data?.length ?? 0;

      const weekGymCount =
        gymWeekResult.data?.length ?? 0;

      const journalTotal =
        allJournalResult.data?.length ?? 0;

      const gymTotal =
        allGymResult.data?.length ?? 0;

      setJournalToday(todayJournalCount);
      setGymThisWeek(weekGymCount);

      setWeeklyPoints(
        todayJournalCount + weekGymCount
      );

      setAllTimePoints(
        journalTotal + gymTotal
      );

      const journalActivitiesRaw =
        (recentJournalResult.data ?? []).map(
          (entry): ActivityItem => ({
            id: `journal-${entry.id}`,
            type: "journal",
            title:
              entry.title?.trim()
                ? entry.title
                : entry.content
                  ? entry.content.slice(0, 30).trim().split(" ").slice(0, -1).join(" ") + "..."
                  : "Untitled Entry",
            created_at: entry.created_at,
            user_id: entry.user_id,
            display_name:
              profilesResult.data?.find(
                (p) => p.id === entry.user_id
              )?.display_name ?? "Unknown User",
          })
        );

      const gymActivitiesRaw =
        (recentGymResult.data ?? []).map(
          (session): ActivityItem => ({
            id: `gym-${session.id}`,
            type: "gym",
            title:
              session.notes?.slice(0, 60) ??
              "Workout logged",
            created_at: session.created_at,
            user_id: session.user_id,
            display_name:
              profilesResult.data?.find(
                (p) => p.id === session.user_id
              )?.display_name ?? "Unknown User",
            photo_url: session.photo_url ?? null,
          })
        );

      const enriched = [...journalActivitiesRaw, ...gymActivitiesRaw]
        .map((a) => ({
          ...a,
          display_name:
            profilesResult.data?.find((p) => p.id === a.user_id)
              ?.display_name ?? "Unknown User",
        }))
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        );

      
      setActivities(enriched.slice(0, 20));

      setLoading(false);
    }
    return (<main className="mx-auto max-w-6xl p-6">
        <div className="mb-8 flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold">
                    Dashboard
                </h1>
            </div>
            <button onClick={signOut}
                className="rounded-lg border px-4 py-2">
                Sign Out
            </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
            <Link href="/journal" className="rounded-xl border p-6 transition hover:bg-zinc-50">
                <h2 className="text-xl font-semibold">
                    Journal
                </h2>
                {
                loading
                    ? (<p className="mt-2 text-zinc-500">
                        Loading...
                    </p>)
                    : (<>
                        <p className="mt-2 text-3xl font-bold"> {journalToday} </p>
                        <p className="text-zinc-500">
                            entries today
                        </p>
                    </>)
            } </Link>
            <Link
              href="/gym"
              className="rounded-xl border p-6 transition hover:bg-zinc-50"
            >
              <h2 className="text-xl font-semibold">
                Gym
              </h2>

              {loading ? (
                <p className="mt-2 text-zinc-500">
                  Loading...
                </p>
              ) : (
                <>
                  <p className="mt-2 text-3xl font-bold">
                    {gymThisWeek}/2
                  </p>

                  <p className="text-zinc-500">
                    sessions this week
                  </p>
                </>
              )}
            </Link>
            <div className="rounded-xl border border-zinc-200 bg-zinc-100 p-6 text-zinc-500">
                <h2 className="text-xl font-semibold">
                    Reading
                </h2>
                <p className="mt-2">
                    Coming Soon
                </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-100 p-6 text-zinc-500">
                <h2 className="text-xl font-semibold">
                    Tasks
                </h2>
                <p className="mt-2">
                    Coming Soon
                </p>
            </div>
        </div>
        <div className="mt-8 rounded-xl border p-6">
          <h2 className="mb-4 text-xl font-semibold">
            Recent Activity
          </h2>

          {activities.length === 0 ? (
            <p className="text-zinc-500">
              No activity yet.
            </p>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className={`rounded-lg border p-4 ${getUserCardClass(activity.user_id)}`}
                >
                  <div className="font-medium">
                    {activity.type === "journal"
                      ? "📝 Journal"
                      : "🏋️ Gym"}
                  </div>

                  <div className="mt-1 text-sm font-semibold">
                    {activity.display_name}
                  </div>

                  <div className="mt-1">
                    {activity.title}
                  </div>

                  <div className="mt-2">
                    {activity.type === "gym" && activity.photo_url && (
                      <img src={activity.photo_url} alt="Gym photo" className="mt-2 h-24 w-24 rounded-md object-cover border"/>
                    )}
                  </div>

                  <div className="mt-1 text-sm text-zinc-500">
                    {new Date(
                      activity.created_at
                    ).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
    </main>);
}