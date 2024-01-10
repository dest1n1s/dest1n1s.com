import { DrawerMarker } from "@/components/layout/drawer";
import { NavigationDrawer } from "@/components/layout/navigation-drawer";

export default async function Drawer() {
  return (
    <>
      <NavigationDrawer />
      <DrawerMarker />
    </>
  );
}
