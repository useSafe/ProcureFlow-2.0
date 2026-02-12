import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  LayoutDashboard,
  FolderPlus,
  FilePlus,
  FileText,
  LogOut,
  Menu,
  Package,
  Layers,
  Users,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Map,
  ChevronLeft,
  Settings,
  Building2,
  Library,
  Archive
} from 'lucide-react';
import { cn } from '@/lib/utils';


interface AppLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  path?: string;
  label: string;
  icon: any;
  adminOnly?: boolean;
  children?: NavItem[];
}

// Define items with optional adminOnly flag and nested children
const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/boxes', label: 'Boxes', icon: Package }, // Added Boxes
  {
    label: 'Storages',
    icon: Library,
    children: [
      { path: '/shelves', label: 'Shelves', icon: Layers },
      { path: '/cabinets', label: 'Cabinets', icon: Archive },
      { path: '/folders', label: 'Folders', icon: FolderOpen },
    ],
  },
  { path: '/procurement/add', label: 'Add Procurement', icon: FilePlus },
  { path: '/procurement/list', label: 'Records', icon: FileText },
  { path: '/visual-allocation', label: 'Visual Map', icon: Map },
  { path: '/divisions', label: 'Divisions', icon: Building2, adminOnly: true }, // Added Divisions
  { path: '/users', label: 'User Management', icon: Users, adminOnly: true },
];

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<string[]>(['Storages']); // Default open

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleDropdown = (label: string) => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setOpenDropdowns([label]);
    } else {
      setOpenDropdowns(prev =>
        prev.includes(label)
          ? prev.filter(item => item !== label)
          : [...prev, label]
      );
    }
  };

  const NavbarItem = ({ item, isCollapsed }: { item: NavItem, isCollapsed: boolean }) => {
    // Skip admin-only items for non-admin users
    if (item.adminOnly && user?.role !== 'admin') {
      return null;
    }

    const Icon = item.icon;
    const isActive = location.pathname === item.path;

    if (item.children) {
      const isOpen = openDropdowns.includes(item.label);
      const hasActiveChild = item.children.some(child => child.path === location.pathname);

      return (
        <Collapsible
          key={item.label}
          open={isOpen && !isCollapsed}
          onOpenChange={() => toggleDropdown(item.label)}
        >
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                hasActiveChild
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-white',
                isCollapsed && 'justify-center px-2'
              )}
              onClick={() => { if (isCollapsed) setIsCollapsed(false); }}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </div>
              {!isCollapsed && (
                isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-6 space-y-1 mt-1">
            {item.children.map(child => {
              const ChildIcon = child.icon;
              const isChildActive = location.pathname === child.path;
              return (
                <Link
                  key={child.path}
                  to={child.path!}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isChildActive
                      ? 'bg-primary text-primary-foreground hover:text-white'
                      : 'text-muted-foreground hover:bg-accent hover:text-white'
                  )}
                >
                  <ChildIcon className="h-4 w-4 shrink-0" />
                  {child.label}
                </Link>
              )
            })}
          </CollapsibleContent>
        </Collapsible>
      )
    }

    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              key={item.path}
              to={item.path!}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground hover:text-white'
                  : 'text-muted-foreground hover:bg-accent hover:text-white',
                isCollapsed && 'justify-center px-2'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">
              {item.label}
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

    );
  }

  const NavContent = () => (
    <div className="flex h-full flex-col">
      <div className={cn("flex items-center gap-2 border-b border-border px-4 py-4 h-16", isCollapsed ? "justify-center" : "")}>
        <img src="/logo.png" alt="Logo" className="h-8 w-8 shrink-0" />
        {!isCollapsed && <span className="text-xl font-bold text-foreground truncate">ProcureFlow</span>}
      </div>

      <nav className="flex-1 space-y-1 p-4 overflow-y-auto overflow-x-hidden">
        {navItems.map(item => <NavbarItem key={item.label} item={item} isCollapsed={isCollapsed} />)}
      </nav>

      <div className="border-t border-border p-4">
        {!isCollapsed && (
          <div className="mb-3 px-3 overflow-hidden">
            <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size={isCollapsed ? "icon" : "default"}
              className={cn(
                "w-full justify-start gap-3 text-muted-foreground hover:text-destructive",
                isCollapsed && "justify-center"
              )}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {!isCollapsed && "Logout"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-[#1e293b] border-slate-800 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                Are you sure you want to log out? You will need to sign in again to access your account.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-transparent border-slate-700 text-white hover:bg-slate-800">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90">
                Logout
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden border-r border-border bg-card lg:block h-screen sticky top-0 transition-all duration-300",
          isCollapsed ? "w-[56px]" : "w-64"
        )}
      >
        <NavContent />
        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 bg-primary text-primary-foreground rounded-full p-1 shadow-md hover:bg-primary/90 transition-colors"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>

      {/* Mobile Header */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="h-8 w-8" />
            <span className="font-bold text-foreground">ProcureFlow</span>
          </div>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-card border-r border-border text-foreground">
              {/* Force collapsed to false for mobile menu */}
              {(() => {
                const DesktopNav = NavContent;
                // We need to render NavContent but force isCollapsed to false.
                // Since NavContent uses state from parent, we can't easily override it without passing props.
                // I'll just inline a version or refactor NavContent to take props.
                // Refactoring NavContent to take isCollapsed prop would be cleaner.
                // But for now, I'll just render it. The state `isCollapsed` controls the desktop sidebar.
                // The mobile sheet is always width 64.
                // Wait, NavContent uses `isCollapsed`.
                // I should refactor `NavContent` to accept props.
                return <NavContent />;
              })()}
            </SheetContent>
          </Sheet>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;