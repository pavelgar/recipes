import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCoarsePointer } from '@/hooks/use-coarse-pointer'
import { getLocale } from '@/paraglide/runtime'

// A choice of one, in the order of their names as they read in the
// interface's language. Pinned choices, the ones most often wanted, come
// first, above a divider. With a finger it's the browser's own select,
// which opens the system's picker; with a mouse or trackpad, shadcn's.
// Both fill the width they're given.
export function ChoiceSelect<T extends string>({
  id,
  value,
  options,
  pinned = [],
  onValueChange,
}: {
  id: string
  value: T
  options: ReadonlyArray<{ readonly value: T; readonly label: string }>
  pinned?: ReadonlyArray<T>
  onValueChange: (value: T) => void
}) {
  const touch = useCoarsePointer()
  const collator = new Intl.Collator(getLocale())
  const byName = (a: { label: string }, b: { label: string }) =>
    collator.compare(a.label, b.label)
  const first = options
    .filter((option) => pinned.includes(option.value))
    .sort(byName)
  const rest = options
    .filter((option) => !pinned.includes(option.value))
    .sort(byName)
  const sorted = [...first, ...rest]
  const choose = (chosen: unknown) => {
    const option = options.find((candidate) => candidate.value === chosen)
    if (option) onValueChange(option.value)
  }

  if (touch) {
    return (
      <NativeSelect
        id={id}
        className="w-full"
        value={value}
        onChange={(event) => choose(event.target.value)}
      >
        {first.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
        {first.length > 0 && rest.length > 0 && <hr />}
        {rest.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    )
  }
  return (
    <Select items={sorted} value={value} onValueChange={choose}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {first.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
        {first.length > 0 && rest.length > 0 && <SelectSeparator />}
        {rest.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
