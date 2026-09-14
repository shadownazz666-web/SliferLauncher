import { openExternal } from "@/lib/openExternal";

interface RichUpdateBodyProps {
  html: string;
}

export function RichUpdateBody({ html }: RichUpdateBodyProps) {
  if (!html) {
    return <p className="text-sm text-ivory/50">No body was included with this update.</p>;
  }

  return (
    <div
      className="update-prose"
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={(event) => {
        const target = (event.target as HTMLElement).closest("a");
        if (!target?.href) {
          return;
        }
        event.preventDefault();
        void openExternal(target.href);
      }}
    />
  );
}
