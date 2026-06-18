"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type JournalEntry = {
  id: number;
  user_id: string;
  title: string | null;
  content: string;
  entry_date: string;
  created_at: string;
};

type JournalComment = {
  id: number;
  journal_entry_id: number;
  user_id: string;
  content: string;
  created_at: string;
};

type Profile = {
  id: string;
  display_name: string;
};

export default function JournalPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [comments, setComments] = useState<JournalComment[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [commentInputs, setCommentInputs] = useState<Record<number, string>>(
    {}
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

    const [entriesResult, commentsResult, profilesResult] = await Promise.all([

      supabase.from("journal_entries").select("*").order("created_at", {
        ascending: false,
      }),

      supabase.from("journal_comments").select("*").order("created_at", {
        ascending: true,
      }),

      supabase.from("profiles").select("*"),
    ]);

    console.log("Profiles query result:");
    console.log(profilesResult);
    console.log("Profiles data:");
    console.log(profilesResult.data);

    if (entriesResult.data) {
      setEntries(entriesResult.data);
    }

    if (commentsResult.data) {
      setComments(commentsResult.data);
    }

    if (profilesResult.data) {
      setProfiles(profilesResult.data);
    }

    setLoading(false);
  }

  async function saveEntry() {
    if (!content.trim()) return;

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("journal_entries").insert({
      user_id: user?.id,
      title: title || null,
      content,
      entry_date: new Date().toISOString().split("T")[0],
    });

    if (!error) {
      setTitle("");
      setContent("");
      await loadData();
    }

    setSaving(false);
  }

  async function saveComment(journalEntryId: number) {
    const comment = commentInputs[journalEntryId];

    if (!comment?.trim()) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("journal_comments").insert({
      journal_entry_id: journalEntryId,
      user_id: user?.id,
      content: comment,
    });

    if (!error) {
      setCommentInputs((prev) => ({
        ...prev,
        [journalEntryId]: "",
      }));

      await loadData();
    }
  }

  function getDisplayName(userId: string) {
    return (
      profiles.find((profile) => profile.id === userId)?.display_name ??
      "Unknown User"
    );
  }

  function getCommentsForEntry(entryId: number) {
    return comments.filter((comment) => comment.journal_entry_id === entryId);
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      {" "}
      <Link
        href="/dashboard"
        className="mb-6 inline-block text-sm text-zinc-500 hover:text-zinc-900"
      >
        ← Dashboard{" "}
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Journal</h1>
      </div>

      <div className="mb-8 rounded-xl border p-4">
        <input
          type="text"
          placeholder="Title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mb-4 w-full rounded-lg border p-3"
        />

        <textarea
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[250px] w-full rounded-lg border p-3"
        />

        <button
          onClick={saveEntry}
          disabled={saving}
          className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Entry"}
        </button>
      </div>
      <div>
        <h2 className="mb-4 text-xl font-semibold">Recent Entries</h2>

        {loading ? (
          <p>Loading...</p>
        ) : entries.length === 0 ? (
          <p className="text-zinc-500">No journal entries yet.</p>
        ) : (
          <div className="space-y-6">
            {entries.map((entry) => (
              <div key={entry.id} className="rounded-xl border p-4">
                <div className="mb-2 text-sm font-medium text-zinc-500">
                  {getDisplayName(entry.user_id)}
                </div>

                {entry.title && (
                  <h3 className="mb-2 text-lg font-semibold">{entry.title}</h3>
                )}

                <p className="whitespace-pre-wrap">{entry.content}</p>

                <p className="mt-3 text-xs text-zinc-500">
                  {new Date(entry.created_at).toLocaleString()}
                </p>

                <div className="mt-6 border-t pt-4">
                  <h4 className="mb-3 font-medium">Comments</h4>

                  <div className="space-y-3">
                    {getCommentsForEntry(entry.id).map((comment) => (
                      <div
                        key={comment.id}
                        className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800"
                      >
                        <div className="text-sm font-medium">
                          {getDisplayName(comment.user_id)}
                        </div>

                        <p className="mt-1">{comment.content}</p>

                        <div className="mt-2 text-xs text-zinc-500">
                          {new Date(comment.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      value={commentInputs[entry.id] || ""}
                      onChange={(e) =>
                        setCommentInputs((prev) => ({
                          ...prev,
                          [entry.id]: e.target.value,
                        }))
                      }
                      className="flex-1 rounded-lg border p-2"
                    />

                    <button
                      onClick={() => saveComment(entry.id)}
                      className="rounded-lg bg-zinc-900 px-4 py-2 text-white"
                    >
                      Comment
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
