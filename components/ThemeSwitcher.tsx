"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeSwitcher() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Check initial local storage or preferred system color scheme
    const isDark =
      localStorage.getItem("theme") === "dark" ||
      (!("theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    if (darkMode) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setDarkMode(true);
    }
  };

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label="Toggle dark mode"
      className="relative flex h-7.5 w-14 items-center rounded-full bg-slate-200 dark:bg-meta-4 p-1 transition duration-200"
    >
      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-boxdark text-slate-700 dark:text-white shadow-1 transition transform duration-200 ${
          darkMode ? "translate-x-6" : "translate-x-0"
        }`}
      >
        {darkMode ? (
          <Moon className="w-3.5 h-3.5 text-dps-gold" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-amber-500" />
        )}
      </div>
    </button>
  );
}
