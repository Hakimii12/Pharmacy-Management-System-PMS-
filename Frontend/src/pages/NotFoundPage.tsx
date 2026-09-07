import { Link } from "react-router-dom"
import { Button } from "@/components/ui/Button"
import { LabelCard } from "@/components/ui/LabelCard"

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-lg py-16">
      <LabelCard perforated eyebrow="404" title="Nothing on this shelf">
        <p className="text-sm text-ink-muted">
          That page does not exist. It may have been renamed, or the link is out of date.
        </p>
        <Link to="/" className="mt-4 inline-block">
          <Button>Back to the dashboard</Button>
        </Link>
      </LabelCard>
    </div>
  )
}
