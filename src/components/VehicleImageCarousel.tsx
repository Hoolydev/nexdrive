import * as React from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card } from "@/components/ui/card";

interface VehicleImageCarouselProps {
  images: string[];
  className?: string;
}

export function VehicleImageCarousel({ images, className }: VehicleImageCarouselProps) {
  if (!images.length) {
    return (
      <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
        <span className="text-muted-foreground">Sem imagem</span>
      </div>
    );
  }

  return (
    <Card className={className}>
      <Carousel className="w-full">
        <CarouselContent>
          {images.map((image, index) => (
            <CarouselItem key={index}>
              <div className="aspect-[4/3] relative overflow-hidden rounded-lg">
                <img
                  src={image}
                  alt={`Imagem ${index + 1} de ${images.length}`}
                  className="w-full h-full object-cover"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {images.length > 1 && (
          <>
            <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2" />
            <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2" />
          </>
        )}
      </Carousel>
    </Card>
  );
}