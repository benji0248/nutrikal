import { useState } from 'react';
import { Share2, Copy, Check } from 'lucide-react';
import type { ShoppingList } from '../../types';
import { formatForWhatsApp } from '../../services/shoppingService';
import { Button } from '../ui/Button';

interface ShoppingExportProps {
  list: ShoppingList;
}

export function ShoppingExport({ list }: ShoppingExportProps) {
  const [copied, setCopied] = useState(false);
  const text = formatForWhatsApp(list);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="secondary" icon={<Share2 size={14} />} onClick={handleWhatsApp}>
        WhatsApp
      </Button>
      <Button
        size="sm"
        variant="secondary"
        icon={copied ? <Check size={14} className="text-green" /> : <Copy size={14} />}
        onClick={handleCopy}
      >
        {copied ? 'Copiado' : 'Copiar'}
      </Button>
    </div>
  );
}
