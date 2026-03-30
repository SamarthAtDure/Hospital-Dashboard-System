import Sidebar from "@components/Sidebar";
import Navbar from "@components/Navbar";
import { useTheme } from "@context/ThemeContext";

function Layout({ children }) {
  const { dark } = useTheme();
  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: dark ? "#0f1117" : "#f0f2f7" }}
    >
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <Navbar />
        <div
          className="flex-1 overflow-y-auto"
          style={{ padding: "28px 32px", background: dark ? "#0f1117" : "#f0f2f7" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default Layout;
