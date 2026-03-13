import { useState, useRef } from 'react';
import { Download, Upload, ExternalLink, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useGistSyncStore } from '../../store/useGistSyncStore';
import { migratePayload } from '../../services/gistService';
import { BottomSheet } from '../ui/BottomSheet';
import { Modal } from '../ui/Modal';

export function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const buildPayload = useGistSyncStore((s) => s.buildPayload);
  const hydrateAllStores = useGistSyncStore((s) => s.hydrateAllStores);
  const push = useGistSyncStore((s) => s.push);

  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmImport, setConfirmImport] = useState(false);
  const [importPayload, setImportPayload] = useState<ReturnType<typeof buildPayload> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const handleExport = () => {
    const payload = buildPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nutrikal-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(reader.result as string);
        const payload = migratePayload(raw);
        setImportPayload(payload);
        setConfirmImport(true);
      } catch {
        alert('Archivo JSON inválido');
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const handleConfirmImport = () => {
    if (importPayload) {
      hydrateAllStores(importPayload);
      push();
    }
    setConfirmImport(false);
    setImportPayload(null);
    setOpen(false);
  };

  const handleLogout = () => {
    logout();
    setConfirmLogout(false);
    setOpen(false);
  };

  const menuContent = (
    <div className="space-y-1">
      {/* User info */}
      <div className="flex items-center gap-3 px-3 py-2 mb-2">
        <img
          src={user.avatarUrl}
          alt={user.login}
          className="w-10 h-10 rounded-full"
        />
        <div>
          <p className="text-sm font-body font-medium text-text-primary">@{user.login}</p>
          <p className="text-[10px] font-body text-muted">github.com/{user.login}</p>
        </div>
      </div>

      <div className="border-t border-border/40 my-2" />

      {/* Export */}
      <button
        onClick={handleExport}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface2/60 transition-colors text-left min-h-[44px]"
      >
        <Download size={16} className="text-muted" />
        <span className="text-sm font-body text-text-primary">Exportar datos (JSON)</span>
      </button>

      {/* Import */}
      <button
        onClick={handleImportClick}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface2/60 transition-colors text-left min-h-[44px]"
      >
        <Upload size={16} className="text-muted" />
        <span className="text-sm font-body text-text-primary">Importar datos (JSON)</span>
      </button>

      <div className="border-t border-border/40 my-2" />

      {/* View Gist */}
      {user.gistId && (
        <a
          href={`https://gist.github.com/${user.gistId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface2/60 transition-colors min-h-[44px]"
          onClick={() => setOpen(false)}
        >
          <ExternalLink size={16} className="text-muted" />
          <span className="text-sm font-body text-text-primary">Ver mi Gist</span>
        </a>
      )}

      <div className="border-t border-border/40 my-2" />

      {/* Logout */}
      <button
        onClick={() => setConfirmLogout(true)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 transition-colors text-left min-h-[44px]"
      >
        <LogOut size={16} className="text-red-400" />
        <span className="text-sm font-body text-red-400">Cerrar sesión</span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );

  return (
    <>
      {/* Avatar trigger */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 p-1 rounded-xl hover:bg-surface2/60 transition-colors"
        aria-label="Menú de usuario"
      >
        <img
          src={user.avatarUrl}
          alt={user.login}
          className="w-7 h-7 rounded-full"
        />
        <span className="text-xs font-body text-muted hidden sm:inline">
          @{user.login}
        </span>
      </button>

      {/* Menu — BottomSheet on mobile, Modal on desktop */}
      <BottomSheet isOpen={open} onClose={() => setOpen(false)} title="Cuenta">
        {menuContent}
      </BottomSheet>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Cuenta">
        {menuContent}
      </Modal>

      {/* Confirm logout */}
      <BottomSheet
        isOpen={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        title="Cerrar sesión"
      >
        <ConfirmDialog
          message="¿Cerrar sesión? Tus datos están guardados en GitHub."
          onConfirm={handleLogout}
          onCancel={() => setConfirmLogout(false)}
        />
      </BottomSheet>
      <Modal
        isOpen={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        title="Cerrar sesión"
      >
        <ConfirmDialog
          message="¿Cerrar sesión? Tus datos están guardados en GitHub."
          onConfirm={handleLogout}
          onCancel={() => setConfirmLogout(false)}
        />
      </Modal>

      {/* Confirm import */}
      <BottomSheet
        isOpen={confirmImport}
        onClose={() => setConfirmImport(false)}
        title="Importar datos"
      >
        <ConfirmDialog
          message="¿Reemplazar todos tus datos actuales?"
          onConfirm={handleConfirmImport}
          onCancel={() => setConfirmImport(false)}
        />
      </BottomSheet>
      <Modal
        isOpen={confirmImport}
        onClose={() => setConfirmImport(false)}
        title="Importar datos"
      >
        <ConfirmDialog
          message="¿Reemplazar todos tus datos actuales?"
          onConfirm={handleConfirmImport}
          onCancel={() => setConfirmImport(false)}
        />
      </Modal>
    </>
  );
}

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm font-body text-muted">{message}</p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 rounded-2xl text-sm font-body font-medium bg-surface2 text-text-primary hover:bg-surface2/80 border border-border transition-all min-h-[48px]"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 px-4 py-2.5 rounded-2xl text-sm font-body font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all min-h-[48px]"
        >
          Confirmar
        </button>
      </div>
    </div>
  );
}
