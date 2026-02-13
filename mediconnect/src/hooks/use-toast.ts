import * as React from 'react'

export type ToastVariant = 'default' | 'destructive'

export interface ToastProps {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ToastOptions {
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

type ToastState = {
  toasts: ToastProps[]
}

type ToastAction =
  | { type: 'ADD_TOAST'; toast: ToastProps }
  | { type: 'UPDATE_TOAST'; toast: Partial<ToastProps> & { id: string } }
  | { type: 'DISMISS_TOAST'; toastId: string }
  | { type: 'REMOVE_TOAST'; toastId: string }

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 200

let count = 0

function generateId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

function addToRemoveQueue(toastId: string, dispatch: React.Dispatch<ToastAction>) {
  if (toastTimeouts.has(toastId)) return

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({ type: 'REMOVE_TOAST', toastId })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case 'UPDATE_TOAST':
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case 'DISMISS_TOAST': {
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toastId ? { ...t, open: false } : t
        ),
      }
    }

    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }

    default:
      return state
  }
}

type Listener = (state: ToastState) => void

let memoryState: ToastState = { toasts: [] }
const listeners: Listener[] = []
let dispatch: React.Dispatch<ToastAction> = () => {}

function globalDispatch(action: ToastAction) {
  memoryState = toastReducer(memoryState, action)
  listeners.forEach((listener) => listener(memoryState))
}

function toast(options: ToastOptions) {
  const id = generateId()
  const duration = options.duration ?? 5000

  const dismiss = () =>
    globalDispatch({ type: 'DISMISS_TOAST', toastId: id })

  globalDispatch({
    type: 'ADD_TOAST',
    toast: {
      ...options,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  const autoCloseTimeout = setTimeout(() => {
    dismiss()
    setTimeout(() => {
      globalDispatch({ type: 'REMOVE_TOAST', toastId: id })
    }, TOAST_REMOVE_DELAY)
  }, duration)

  return {
    id,
    dismiss,
    update: (props: Partial<ToastOptions>) =>
      globalDispatch({ type: 'UPDATE_TOAST', toast: { ...props, id } }),
  }
}

function useToast() {
  const [state, setState] = React.useState<ToastState>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId: string) =>
      globalDispatch({ type: 'DISMISS_TOAST', toastId }),
  }
}

export { useToast, toast }
