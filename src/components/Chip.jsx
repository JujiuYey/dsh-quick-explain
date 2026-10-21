import { SparkleIcon } from './icons.jsx'

/** The floating "解释" button anchored to the current text selection. */
export function Chip({ copy, chip, onStart }) {
  return (
    <button
      type="button"
      className="qe-chip"
      data-quick-explain-ui={true}
      aria-label={copy.chipLabel}
      title={copy.chipLabel}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onStart(chip)}
      style={{
        top: Math.max(10, chip.y - 36),
        left: Math.max(8, Math.min(window.innerWidth - 96, chip.x - 36)),
      }}
    >
      <SparkleIcon />
      <span>{copy.chip}</span>
    </button>
  )
}
