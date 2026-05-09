import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/page";
import { EventEditor } from "@/components/event-editor";

export const Route = createFileRoute("/dashboard/events/$eventId")({
  head: () => ({ meta: [{ title: "Edit event — Gather" }] }),
  component: EditEventPage,
});

function EditEventPage() {
  const { eventId } = Route.useParams();
  return (
    <div className="container-page py-10">
      <PageHeader
        eyebrow="Event editor"
        title="Edit event"
        description="Update details, publish, unpublish, or duplicate this event."
      />
      <div className="mt-8">
        <EventEditor eventId={eventId} />
      </div>
    </div>
  );
}
