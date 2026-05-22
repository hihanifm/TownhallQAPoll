import './PinEntryModal.css';

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onCancel();
  };

  return (
    <div className="pin-modal-backdrop" onClick={handleBackdropClick}>
      <div className="pin-modal-content" role="alertdialog" aria-labelledby="confirm-dialog-title" aria-modal="true">
        <div className="pin-modal-header">
          <h2 id="confirm-dialog-title">{title}</h2>
          <button type="button" className="pin-modal-close" onClick={onCancel} aria-label="Close">
            &times;
          </button>
        </div>
        <div className="pin-modal-body">
          <p>{message}</p>
          <div className="pin-modal-actions">
            <button type="button" onClick={onCancel} className="pin-modal-cancel">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm?.()}
              className={danger ? 'pin-modal-verify pin-modal-verify--danger' : 'pin-modal-verify'}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
