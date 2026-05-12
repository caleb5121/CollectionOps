import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ | CollectionOps",
  description: "Answers about TCGplayer imports, profit calculations, and using CollectionOps.",
};

export default function HelpFaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
