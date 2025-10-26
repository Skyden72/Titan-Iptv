
import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { SeriesInfo } from '../types';

const SeriesCard: React.FC<{ item: SeriesInfo }> = ({ item }) => (
    <div className="group relative rounded-lg overflow-hidden cursor-pointer transform hover:scale-105 transition-transform duration-300 shadow-lg">
        <img src={item.poster} alt={item.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
        <div className="absolute inset-0 p-4 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <h3 className="text-white font-bold text-lg">{item.title}</h3>
            <p className="text-gray-300 text-sm">{item.year} - {item.rating} ★</p>
        </div>
    </div>
);

const Series: React.FC = () => {
  const series = useAppStore((state) => state.series);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold text-white mb-6">Series</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 sm:gap-6">
        {series.map((seriesItem) => (
          <SeriesCard key={seriesItem.id} item={seriesItem} />
        ))}
      </div>
    </div>
  );
};

export default Series;
