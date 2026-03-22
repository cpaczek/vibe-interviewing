export interface StyledText {
  text: string
  color?: 'accent' | 'green' | 'yellow' | 'red' | 'dim' | 'bold' | 'white' | 'muted'
}

export type LinePart = string | StyledText

export type FlowStep =
  | { type: 'command'; text: string }
  | { type: 'output'; lines: LinePart[][] }
  | {
      type: 'spinner'
      text: string
      duration: number
      doneText: string
      doneColor?: 'green' | 'accent'
    }
  | { type: 'select'; prompt: string; options: string[]; selected: number }
  | { type: 'confirm'; prompt: string; answer: string }
  | {
      type: 'box'
      lines: LinePart[][]
      border: 'round' | 'double'
      borderColor?: 'accent' | 'yellow'
    }
  | { type: 'pause'; duration: number }
