import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Tag, X } from 'lucide-react';

interface BannedBesinManagerProps {
  clientId: number;
  bannedBesins: Array<{
    id: number;
    besin: {
      id: number;
      name: string;
    };
    reason?: string;
  }>;
  onUpdate: () => void;
}

export const BannedBesinManager = ({ clientId, bannedBesins, onUpdate }: BannedBesinManagerProps) => {
  const [selectedBesin, setSelectedBesin] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/clients/${clientId}/banned-besins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          besinId: parseInt(selectedBesin),
          reason
        })
      });

      if (!response.ok) throw new Error('Failed to add banned besin');
      onUpdate();
      setSelectedBesin('');
      setReason('');
    } catch (error) {
      console.error('Error adding banned besin:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (besinId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/clients/${clientId}/banned-besins?besinId=${besinId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to remove banned besin');
      onUpdate();
    } catch (error) {
      console.error('Error removing banned besin:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Yasaklı Besinler</h3>
      <div className="flex gap-2">
        <Select
          value={selectedBesin}
          onChange={(e) => setSelectedBesin(e.target.value)}
          className="flex-1"
        >
          <option value="">Besin Seçin</option>
          {/* Add besin options here */}
        </Select>
        <Input
          placeholder="Yasak Nedeni"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="flex-1"
        />
        <Button
          onClick={handleAdd}
          disabled={!selectedBesin || loading}
          className="whitespace-nowrap"
        >
          <Tag className="w-4 h-4 mr-2" />
          Ekle
        </Button>
      </div>
      
      <div className="space-y-2">
        {bannedBesins.map((banned) => (
          <div
            key={banned.id}
            className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
          >
            <div>
              <span className="font-medium">{banned.besin.name}</span>
              {banned.reason && (
                <span className="text-sm text-gray-500 ml-2">
                  ({banned.reason})
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRemove(banned.besin.id)}
              disabled={loading}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};