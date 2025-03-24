import React from "react";

export default function Tooltip({ text }: { text: string }) {
  return (
    <div className="tooltip" data-tip={text}>
      <button className="btn btn-xs btn-circle">?</button>
    </div>
  );
}
