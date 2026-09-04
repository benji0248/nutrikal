import { useState } from 'react';
import { FlaskConical, Heart, LogOut, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { BottomSheet } from '../ui/BottomSheet';
import { Modal } from '../ui/Modal';
import type { AppTab } from '../../types';

interface UserMenuProps {
  onTabChange: (tab: AppTab) => void;
}

const MOBILE_MODULES: { tab: AppTab; label: string; icon: LucideIcon }[] = [
  { tab: 'estudios', label: 'Mis estudios', icon: FlaskConical },
  { tab: 'historial', label: 'Favoritos', icon: Heart },
  { tab: 'settings', label: 'Ajustes', icon: Settings },
];

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function getAvatarColor(username: string): string {
  const colors = [
    'bg-accent', 'bg-pink-500', 'bg-emerald-500', 'bg-amber-500',
    'bg-sky-500', 'bg-violet-500', 'bg-rose-500', 'bg-teal-500',
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export const UserMenu = ({ onTabChange }: UserMenuProps) => {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  if (!user) return null;

  const initials = getInitials(user.displayName || user.username);
  const avatarColor = getAvatarColor(user.username);

  const handleModule = (tab: AppTab) => {
    onTabChange(tab);
    setOpen(false);
  };

  const handleLogout = () => {
    logout();
    setConfirmLogout(false);
    setOpen(false);
  };

  const userHeader = (
    <div className="flex items-center gap-3 px-3 py-2 mb-2">
      <div className={`w-10 h-10 rounded-full ${avatarColor} flex items-center justify-center`}>
        <span className="text-white font-heading font-bold text-sm">{initials}</span>
      </div>
      <div>
        <p className="text-sm font-body font-medium text-text-primary">@{user.username}</p>
        <p className="text-[10px] font-body text-muted">{user.email}</p>
      </div>
    </div>
  );

  const logoutButton = (
    <button
      type="button"
      onClick={() => setConfirmLogout(true)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 transition-colors text-left min-h-[44px]"
    >
      <LogOut size={16} className="text-red-400" />
      <span className="text-sm font-body text-red-400">Cerrar sesión</span>
    </button>
  );

  const mobileMenu = (
    <div className="space-y-1">
      {userHeader}
      <div className="border-t border-border/40 my-2" />
      <p className="px-3 pt-1 pb-1 text-[10px] font-body font-semibold uppercase tracking-widest text-muted">
        Módulos
      </p>
      {MOBILE_MODULES.map(({ tab, label, icon: Icon }) => (
        <button
          key={tab}
          type="button"
          onClick={() => handleModule(tab)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface2/60 transition-colors text-left min-h-[44px]"
        >
          <Icon size={16} className="text-muted" />
          <span className="text-sm font-body text-text-primary">{label}</span>
        </button>
      ))}
      <div className="border-t border-border/40 my-2" />
      {logoutButton}
    </div>
  );

  const desktopMenu = (
    <div className="space-y-1">
      {userHeader}
      <div className="border-t border-border/40 my-2" />
      {logoutButton}
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 p-1 rounded-xl hover:bg-surface2/60 transition-colors"
        aria-label="Menú de usuario"
      >
        <div className={`w-7 h-7 rounded-full ${avatarColor} flex items-center justify-center`}>
          <span className="text-white font-heading font-bold text-[10px]">{initials}</span>
        </div>
        <span className="text-xs font-body text-muted hidden sm:inline">
          @{user.username}
        </span>
      </button>

      <BottomSheet isOpen={open} onClose={() => setOpen(false)} title="Cuenta">
        {mobileMenu}
      </BottomSheet>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Cuenta">
        {desktopMenu}
      </Modal>

      <BottomSheet
        isOpen={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        title="Cerrar sesión"
      >
        <ConfirmDialog
          message="Tu información está guardada en la nube. Podés volver a entrar cuando quieras."
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
          message="Tu información está guardada en la nube. Podés volver a entrar cuando quieras."
          onConfirm={handleLogout}
          onCancel={() => setConfirmLogout(false)}
        />
      </Modal>
    </>
  );
};

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
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 rounded-2xl text-sm font-body font-medium bg-surface2 text-text-primary hover:bg-surface2/80 border border-border transition-all min-h-[48px]"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 px-4 py-2.5 rounded-2xl text-sm font-body font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all min-h-[48px]"
        >
          Confirmar
        </button>
      </div>
    </div>
  );
}
