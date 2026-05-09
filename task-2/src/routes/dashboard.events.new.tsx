import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/page";
import { EventEditor } from "@/components/event-editor";

export const Route = createFileRoute("/dashboard/events/new")({
  head: () => ({ meta: [{ title: "New event — Gather" }] }),
  component: NewEventPage,
});

function NewEventPage() {
  return (
    <div className="container-page py-10">
      <PageHeader
        eyebrow="Event editor"
        title="Create a new event"
        description="Draft your event page. Publish when you're ready to share it publicly."
      />
      <div className="mt-8">
        <EventEditor />
      </div>
    </div>
  );
}
