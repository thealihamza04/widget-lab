import { useLenis } from "./hooks/use-lenis"
import AppShell from "./shell/AppShell"

// One widget at a time: the home page is a list, each widget opens on its own page (#/<id>).
// The previous all-widgets masonry grid rendered and animated every widget at once.
export default function App() {
  useLenis()
  return <AppShell />
}
