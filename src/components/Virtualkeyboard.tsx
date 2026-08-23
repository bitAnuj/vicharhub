import { useState } from "react";
import { Keyboard, X, Delete, CornerDownLeft, ArrowBigUp } from "lucide-react";

// Each key is [normal, shifted]
const NUMBER_ROW: [string, string][] = [
  ["`", "~"], ["1", "!"], ["2", "@"], ["3", "#"], ["4", "$"],
  ["5", "%"], ["6", "^"], ["7", "&"], ["8", "*"], ["9", "("],
  ["0", ")"], ["-", "_"], ["=", "+"],
];

const ROW_2: [string, string][] = [
  ["q", "Q"], ["w", "W"], ["e", "E"], ["r", "R"], ["t", "T"],
  ["y", "Y"], ["u", "U"], ["i", "I"], ["o", "O"], ["p", "P"],
  ["[", "{"], ["]", "}"], ["\\", "|"],
];

const ROW_3: [string, string][] = [
  ["a", "A"], ["s", "S"], ["d", "D"], ["f", "F"], ["g", "G"],
  ["h", "H"], ["j", "J"], ["k", "K"], ["l", "L"], [";", ":"], ["'", '"'],
];

const ROW_4: [string, string][] = [
  ["z", "Z"], ["x", "X"], ["c", "C"], ["v", "V"], ["b", "B"],
  ["n", "N"], ["m", "M"], [",", "<"], [".", ">"], ["/", "?"],
];

function VirtualKeyboard() {
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const typeChar = (char: string) => {
    document.execCommand("insertText", false, char);
    if (shift) setShift(false);
  };

  const letterFor = ([lower, upper]: [string, string]) => {
    const isLetter = /^[a-z]$/i.test(lower);
    if (isLetter) {
      const isUpper = shift !== capsLock; // caps lock + shift cancel out
      return isUpper ? upper : lower;
    }
    return shift ? upper : lower;
  };

  const handleBackspace = () => document.execCommand("delete");
  const handleTab = () => typeChar("\t");
  const handleSpace = () => typeChar(" ");
  const handleEnter = () => document.execCommand("insertParagraph");

  const keyClass =
    "flex h-11 flex-col items-center justify-center rounded-md bg-zinc-800 text-zinc-200 hover:bg-zinc-700 leading-none";

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-4 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 shadow-lg hover:bg-zinc-700"
        title="On-screen keyboard"
      >
        {open ? <X size={20} /> : <Keyboard size={20} />}
      </button>

      {open && (
        <div className="fixed bottom-20 right-4 z-40 w-[420px] max-w-[95vw] rounded-xl border border-zinc-700 bg-zinc-900 p-2 shadow-2xl">
          {/* Number row */}
          <div className="mb-1 flex gap-1">
            {NUMBER_ROW.map((k) => (
              <button
                key={k[0]}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => typeChar(shift ? k[1] : k[0])}
                className={`${keyClass} flex-1`}
              >
                {shift ? k[1] : k[0]}
              </button>
            ))}
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleBackspace}
              className={`${keyClass} flex-[1.6]`}
            >
              <Delete size={16} />
            </button>
          </div>

          {/* Row 2 with Tab */}
          <div className="mb-1 flex gap-1">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleTab}
              className={`${keyClass} flex-[1.4] text-xs`}
            >
              Tab
            </button>
            {ROW_2.map((k) => (
              <button
                key={k[0]}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => typeChar(letterFor(k))}
                className={`${keyClass} flex-1`}
              >
                {letterFor(k)}
              </button>
            ))}
          </div>

          {/* Row 3 with Caps Lock + Enter */}
          <div className="mb-1 flex gap-1">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setCapsLock((c) => !c)}
              className={`${keyClass} flex-[1.4] text-xs ${
                capsLock ? "bg-blue-600 text-white hover:bg-blue-500" : ""
              }`}
            >
              Caps
            </button>
            {ROW_3.map((k) => (
              <button
                key={k[0]}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => typeChar(letterFor(k))}
                className={`${keyClass} flex-1`}
              >
                {letterFor(k)}
              </button>
            ))}
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleEnter}
              className={`${keyClass} flex-[1.6]`}
            >
              <CornerDownLeft size={16} />
            </button>
          </div>

          {/* Row 4 with both Shift keys */}
          <div className="mb-1 flex gap-1">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShift((s) => !s)}
              className={`${keyClass} flex-[1.8] ${
                shift ? "bg-blue-600 text-white hover:bg-blue-500" : ""
              }`}
            >
              <ArrowBigUp size={16} />
            </button>
            {ROW_4.map((k) => (
              <button
                key={k[0]}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => typeChar(letterFor(k))}
                className={`${keyClass} flex-1`}
              >
                {letterFor(k)}
              </button>
            ))}
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShift((s) => !s)}
              className={`${keyClass} flex-[1.8] ${
                shift ? "bg-blue-600 text-white hover:bg-blue-500" : ""
              }`}
            >
              <ArrowBigUp size={16} />
            </button>
          </div>

          {/* Space bar */}
          <div className="flex gap-1">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleSpace}
              className={`${keyClass} flex-1`}
            >
              Space
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default VirtualKeyboard;
