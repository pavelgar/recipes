import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCoarsePointer } from '@/hooks/use-coarse-pointer'
import { getLocale } from '@/paraglide/runtime'

// A choice of one from a few, in the order of their names as they read in
// the interface's language. With a finger it's the browser's own select,
// which opens the system's picker; with a mouse or trackpad, shadcn's. Both
// fill the width they're given.
export function ChoiceSelect<T extends string>({
  id,
  value,
  options,
  onValueChange,
}: {
  id: string
  value: T
  options: ReadonlyArray<{ readonly value: T; readonly label: string }>
  onValueChange: (value: T) => void
}) {
  const touch = useCoarsePointer()
  const collator = new Intl.Collator(getLocale())
  const sorted = [...options].sort((a, b) => collator.compare(a.label, b.label))
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
        {sorted.map((option) => (
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
        {sorted.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
