import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Search, 
  Sun, 
  Handshake, 
  Store, 
  User, 
  Plus, 
  Pause, 
  Play, 
  ArrowRight,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../api/client';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, isSellerWorkspace, switchWorkspace, refreshUser } = useAuth();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open
          setQuery('');
          setSelectedIndex(0);
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    {
      id: 'today',
      title: 'Go to Today',
      category: 'Navigation',
      icon: Sun,
      run: () => navigate('/app'),
    },
    {
      id: 'deals',
      title: 'Go to Deals',
      category: 'Navigation',
      icon: Handshake,
      run: () => navigate('/app/deals'),
    },
    {
      id: 'market',
      title: isSellerWorkspace ? 'Go to My Listings' : 'Go to Marketplace',
      category: 'Navigation',
      icon: Store,
      run: () => navigate(isSellerWorkspace ? '/app/listings' : '/app/marketplace'),
    },
    {
      id: 'account',
      title: 'Account Settings',
      category: 'Navigation',
      icon: User,
      run: () => navigate('/app/settings'),
    },
    {
      id: 'new-request',
      title: isSellerWorkspace ? 'Create new listing' : 'Start a new request',
      category: 'Quick action',
      icon: Plus,
      run: () => navigate(isSellerWorkspace ? '/app/listings/new' : '/app/requests/new'),
    },
    {
      id: 'switch-mode',
      title: isSellerWorkspace ? 'Switch to Buying mode' : 'Switch to Selling mode',
      category: 'Workspace',
      icon: Layers,
      run: async () => {
        await switchWorkspace(isSellerWorkspace ? 'buyer' : 'seller');
        toast.info(isSellerWorkspace ? 'Switched to Buying mode.' : 'Switched to Selling mode.');
      },
    },
    {
      id: 'pause-automation',
      title: user?.isAutomationPaused ? 'Resume automation' : 'Pause all automation',
      category: 'Safety',
      icon: user?.isAutomationPaused ? Play : Pause,
      run: async () => {
        try {
          await api.setAutomationPaused(!user?.isAutomationPaused);
          await refreshUser();
          toast.success(user?.isAutomationPaused ? 'Automation resumed.' : 'All automation paused.');
        } catch {
          toast.error('Could not update automation setting.');
        }
      },
    },
  ];

  const filtered = actions.filter((a) =>
    a.title.toLowerCase().includes(query.toLowerCase()) ||
    a.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (action: typeof actions[0]) => {
    action.run();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[600px] bg-surface border border-border-subtle rounded-surface shadow-decision overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-border-subtle gap-3">
          <Search className="w-5 h-5 text-text-muted shrink-0" strokeWidth={2} />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-body text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          <kbd className="px-2 py-0.5 text-secondary text-text-muted bg-raised border border-border-subtle rounded-md">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[360px] overflow-y-auto p-2 flex flex-col gap-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-text-muted text-secondary">
              No matching commands found.
            </div>
          ) : (
            filtered.map((action, idx) => {
              const Icon = action.icon;
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={action.id}
                  onClick={() => handleSelect(action)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-control cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-raised text-text-primary'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-text-primary" strokeWidth={2} />
                    <span className="font-medium text-body text-text-primary">{action.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-secondary text-text-muted">{action.category}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-text-muted" strokeWidth={2} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
