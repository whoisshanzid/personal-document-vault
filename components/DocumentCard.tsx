"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ipfsUrl } from "@/lib/ipfs";
import { shortAddress, type MergedDocument } from "@/lib/types";

interface DocumentCardProps {
  doc: MergedDocument;
  onShare?: (doc: MergedDocument) => void;
  onRevoke?: (doc: MergedDocument) => void;
  onDelete?: (doc: MergedDocument) => void;
  deleting?: boolean;
}

export function DocumentCard({
  doc,
  onShare,
  onRevoke,
  onDelete,
  deleting,
}: DocumentCardProps) {
  return (
    <Card className="flex h-full flex-col gap-4">
      <CardContent className="flex h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              {doc.title}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              On-chain ID #{doc.documentId.toString()} ·{" "}
              {doc.uploadedAt.toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
          <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            PDF
          </span>
        </div>

        {doc.description && (
          <p className="text-sm text-muted-foreground">{doc.description}</p>
        )}

        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            Owner:{" "}
            <span className="font-mono text-foreground">
              {shortAddress(doc.owner)}
            </span>
          </p>
          <p className="truncate" title={doc.cid}>
            CID: <span className="font-mono text-foreground">{doc.cid}</span>
          </p>
        </div>

        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <Button size="sm" variant="default" onClick={() => window.open(ipfsUrl(doc.cid), "_blank", "noopener")}>
            Open
          </Button>
          {onShare && (
            <Button size="sm" variant="outline" onClick={() => onShare(doc)}>
              Share
            </Button>
          )}
          {onRevoke && (
            <Button size="sm" variant="outline" onClick={() => onRevoke(doc)}>
              Revoke
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="destructive"
              loading={deleting}
              onClick={() => onDelete(doc)}
            >
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
