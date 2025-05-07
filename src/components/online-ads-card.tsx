
import Image from 'next/image';
import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const OnlineAdsCard: FC = () => {
  return (
    <Card className="shadow-lg rounded-lg w-full">
      <CardHeader>
        <CardTitle className="text-lg font-medium text-primary">Sponsored Content</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="aspect-[4/1] relative w-full overflow-hidden rounded-b-lg">
          <Image
            src="https://picsum.photos/1200/300"
            alt="Advertisement"
            fill
            data-ai-hint="advertisement banner"
            className="rounded-b-lg object-cover"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default OnlineAdsCard;
