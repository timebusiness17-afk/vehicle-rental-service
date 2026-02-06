import { ArrowLeft, Heart, Store, MapPin, Star, Car, Bike, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useSavedShops, useUnsaveShop } from '@/hooks/useSavedShops';
import { useVehicles } from '@/hooks/useVehicles';
import { Skeleton } from '@/components/ui/skeleton';

export const SavedShops = () => {
  const navigate = useNavigate();
  const { data: savedShops = [], isLoading } = useSavedShops();
  const unsaveShop = useUnsaveShop();

  const handleUnsave = async (shopId: string) => {
    await unsaveShop.mutateAsync(shopId);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Saved Shops</h1>
        </div>
      </header>

      <main className="px-4 py-6 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-16 w-16 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : savedShops.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-8 text-center">
              <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-lg font-medium text-foreground">No saved shops yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Tap the heart icon on any shop to save it here
              </p>
              <Button className="mt-4" onClick={() => navigate('/home')}>
                Explore Shops
              </Button>
            </CardContent>
          </Card>
        ) : (
          savedShops.map(({ id, shop }) => (
            shop && (
              <Card 
                key={id} 
                className="border-border cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/shop/${shop.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {shop.image_url ? (
                        <img src={shop.image_url} alt={shop.name} className="h-full w-full rounded-xl object-cover" />
                      ) : (
                        <Store className="h-8 w-8 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{shop.name}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <p className="text-xs text-muted-foreground truncate">{shop.address}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnsave(shop.id);
                          }}
                          disabled={unsaveShop.isPending}
                        >
                          {unsaveShop.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                          )}
                        </Button>
                      </div>

                      <div className="flex items-center gap-3 mt-2">
                        {shop.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                            <span className="text-xs font-medium text-foreground">{shop.rating}</span>
                          </div>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          shop.is_open 
                            ? 'bg-green-500/10 text-green-500' 
                            : 'bg-orange-500/10 text-orange-500'
                        }`}>
                          {shop.is_open ? 'Open' : 'Closed'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          ))
        )}
      </main>
    </div>
  );
};
