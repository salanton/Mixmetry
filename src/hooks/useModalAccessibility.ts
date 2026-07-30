import { useEffect, useRef } from 'react'

const getLayer = (element: Element) => {
  const overlay = element.parentElement
  const value = overlay ? Number.parseInt(getComputedStyle(overlay).zIndex, 10) : 0
  return Number.isFinite(value) ? value : 0
}

export const useModalAccessibility = (
  activeKey: string | null,
  dialogSelector: string,
  onClose: () => void,
) => {
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!activeKey) return

    const dialogs = Array.from(document.querySelectorAll<HTMLElement>(dialogSelector))
    const dialog = dialogs.sort((a, b) => getLayer(b) - getLayer(a))[0]
    if (!dialog) return

    const overlay = dialog.parentElement
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousBodyOverflow = document.body.style.overflow
    const inertElements: HTMLElement[] = []

    document.body.style.overflow = 'hidden'

    if (overlay?.parentElement) {
      Array.from(overlay.parentElement.children).forEach((sibling) => {
        if (sibling !== overlay && sibling instanceof HTMLElement && !sibling.inert) {
          sibling.inert = true
          inertElements.push(sibling)
        }
      })
    }

    const topbar = document.querySelector<HTMLElement>('.topbar')
    if (topbar && !topbar.inert) {
      topbar.inert = true
      inertElements.push(topbar)
    }

    const focusTarget = dialog.querySelector<HTMLElement>('[aria-label="Закрыть"], [aria-label="Close"], button, [href], input, select, textarea')
    const frame = window.requestAnimationFrame(() => (focusTarget ?? dialog).focus())

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousBodyOverflow
      inertElements.forEach((element) => { element.inert = false })
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [activeKey, dialogSelector])
}
