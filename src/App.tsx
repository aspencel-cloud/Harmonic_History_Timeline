import React, { useState } from "react";
import HistoryTimelineApp from "./HistoryTimelineApp";

export default function App() {
  const [yearStart, setYearStart] = useState<number | "">(1900);
  const [yearEnd, setYearEnd] = useState<number | "">(2025);

  const onSetYearRange = (s: number | "", e: number | "") => {
    setYearStart(s);
    setYearEnd(e);
  };

  return (
    <HistoryTimelineApp
      yearStart={yearStart}
      yearEnd={yearEnd}
      onSetYearRange={onSetYearRange}
    />
  );
}
