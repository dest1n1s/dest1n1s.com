import { SignIn } from "@/components/ui/signin";
import { auth } from "@/lib/auth";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) {
    return <SignIn />;
  } else return <>{children}</>;
}
