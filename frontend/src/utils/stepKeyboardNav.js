export function isTextFieldElement(el) {
  if (!el || el.isContentEditable) return false;
  const tag = el.tagName;
  if (tag === 'TEXTAREA') return true;
  if (tag === 'INPUT') {
    const type = (el.type || 'text').toLowerCase();
    return !['radio', 'checkbox', 'button', 'submit', 'reset', 'file', 'hidden', 'range'].includes(type);
  }
  if (tag === 'SELECT') return true;
  return false;
}

export function isChoiceInputElement(el) {
  return el?.tagName === 'INPUT' && ['radio', 'checkbox'].includes((el.type || '').toLowerCase());
}

function isModifierOnly(e) {
  return e.altKey;
}

/**
 * Stepped UI keyboard: arrows for prev/next, Enter to advance (Ctrl/Cmd+Enter in textarea).
 * Returns true if the event was handled.
 */
export function handleStepKeyboard(e, { container, onPrev, onNext, isLast, onSubmit, onEnter }) {
  if (!container?.contains(document.activeElement)) return false;
  if (isModifierOnly(e)) return false;

  const target = document.activeElement;
  const inText = isTextFieldElement(target);
  const inChoice = isChoiceInputElement(target);

  const advance = () => {
    if (onEnter) onEnter();
    else onNext();
  };

  if (e.key === 'Enter') {
    if (inChoice) return false;
    if (target?.tagName === 'TEXTAREA' && !(e.ctrlKey || e.metaKey)) return false;
    if (target?.tagName === 'TEXTAREA' && e.shiftKey) return false;
    e.preventDefault();
    if (isLast && onSubmit) onSubmit();
    else advance();
    return true;
  }

  if (e.key === 'ArrowLeft') {
    if (inText || inChoice) return false;
    e.preventDefault();
    onPrev();
    return true;
  }

  if (e.key === 'ArrowRight') {
    if (inText || inChoice || isLast) return false;
    e.preventDefault();
    advance();
    return true;
  }

  if (e.key === 'ArrowUp') {
    if (inText || inChoice) return false;
    e.preventDefault();
    onPrev();
    return true;
  }

  if (e.key === 'ArrowDown') {
    if (inText || inChoice || isLast) return false;
    e.preventDefault();
    advance();
    return true;
  }

  return false;
}

/**
 * Cycle single-choice or rating value with ArrowUp/ArrowDown.
 */
export function handleChoiceArrow(e, { container, options, currentValue, onSelect }) {
  if (!['ArrowUp', 'ArrowDown'].includes(e.key)) return false;
  if (!container?.contains(document.activeElement)) return false;
  if (isTextFieldElement(document.activeElement) || isChoiceInputElement(document.activeElement)) {
    return false;
  }

  const list = options;
  if (!list?.length) return false;

  let idx = list.findIndex((o) => o === currentValue);
  if (idx < 0) idx = 0;

  if (e.key === 'ArrowDown') idx = Math.min(idx + 1, list.length - 1);
  else idx = Math.max(idx - 1, 0);

  e.preventDefault();
  onSelect(list[idx]);
  return true;
}
