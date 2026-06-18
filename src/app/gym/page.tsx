"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type GymSession = {
  id: number;
  user_id: string;
  session_date: string;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
};

type Profile = {
  id: string;
  display_name: string;
};

export default function GymPage() {
  const router = useRouter();

  const [sessions, setSessions] = useState<GymSession[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [notes, setNotes] = useState("");
  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  

  useEffect(() => {
    checkUser();
    loadData();
  }, []);

  async function checkUser() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.replace("/");
    }
  }

  async function loadData() {
    setLoading(true);

    const [sessionsResult, profilesResult] =
      await Promise.all([
        supabase
          .from("gym_sessions")
          .select("*")
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("profiles")
          .select("*"),
      ]);

    if (sessionsResult.data) {
      setSessions(sessionsResult.data);
    }

    if (profilesResult.data) {
      setProfiles(profilesResult.data);
    }

    setLoading(false);
  }

  function getDisplayName(userId: string) {
    return (
      profiles.find(
        (profile) => profile.id === userId
      )?.display_name ?? "Unknown User"
    );
  }

  async function saveSession() {
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      return;
    }

    let photoUrl: string | null = null;

    if (selectedFile) {
      const extension =
        selectedFile.name.split(".").pop();

      const filePath =
        `${user.id}/${Date.now()}.${extension}`;

      const { error: uploadError } =
        await supabase.storage
          .from("photos")
          .upload(filePath, selectedFile);

      if (!uploadError) {
        const {
          data: signedUrlData,
        } = await supabase.storage
          .from("photos")
          .createSignedUrl(
            filePath,
            60 * 60 * 24 * 365
          );

        photoUrl =
          signedUrlData?.signedUrl ?? null;
      }
    }

    const { error } = await supabase
      .from("gym_sessions")
      .insert({
        user_id: user.id,
        session_date:
          new Date()
            .toISOString()
            .split("T")[0],
        notes,
        photo_url: photoUrl,
      });

    if (!error) {
      setNotes("");
      setSelectedFile(null);
      setPreviewUrl(null);

      const fileInput =
        document.getElementById(
          "gym-photo-input"
        ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }

      await loadData();
    }

    setSaving(false);
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <Link
        href="/dashboard"
        className="mb-6 inline-block text-sm text-zinc-500 hover:text-zinc-900"
      >
        ← Dashboard
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-semibold">
          Gym
        </h1>
      </div>

      <div className="mb-8 rounded-xl border p-4">
        <h2 className="mb-4 text-lg font-semibold">
          Log Workout
        </h2>

        <textarea
          value={notes}
          onChange={(e) =>
            setNotes(e.target.value)
          }
          placeholder="Enter notes."
          className="min-h-[180px] w-full rounded-lg border p-3"
        />

        <div className="mt-4">
        <label
            htmlFor="gym-photo-input"
            className="inline-flex cursor-pointer items-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-zinc-50"
        >
            Upload Progress Photo
        </label>

        <input
            id="gym-photo-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
                const file =
                    e.target.files?.[0] ?? null;

                setSelectedFile(file);

                if (file) {
                    setPreviewUrl(
                    URL.createObjectURL(file)
                    );
                }
            }}
        />

        {selectedFile && (
            <p className="mt-2 text-sm text-zinc-500">
            Selected: {selectedFile.name}
            </p>
        )}
        </div>

        <button
          onClick={saveSession}
          disabled={saving}
          className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {saving
            ? "Saving..."
            : "Log Workout"}
        </button>
        {previewUrl && (
            <img
                src={previewUrl}
                alt="Preview"
                className="mt-4 max-h-80 rounded-lg border"
            />
        )}
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold">
          Recent Gym Sessions
        </h2>

        {loading ? (
          <p>Loading...</p>
        ) : sessions.length === 0 ? (
          <p className="text-zinc-500">
            No gym sessions yet.
          </p>
        ) : (
          <div className="space-y-6">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="rounded-xl border p-4"
              >
                <div className="mb-2 text-sm font-medium text-zinc-500">
                  {getDisplayName(
                    session.user_id
                  )}
                </div>

                <p className="mb-4 whitespace-pre-wrap">
                  {session.notes}
                </p>

                {session.photo_url && (
                  <img
                    src={session.photo_url}
                    alt="Workout"
                    className="mb-4 max-h-[500px] w-full rounded-lg object-cover"
                  />
                )}

                <div className="text-xs text-zinc-500">
                  {new Date(
                    session.created_at
                  ).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}