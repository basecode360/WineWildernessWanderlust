export const tours = [
  {
    id: 'tour_01',
    title: 'Acadia Lobster Roll Tour',
    description: 'A tasty audio journey across Acadia',
    price: 5.99,
    stops: [
      {
        id: 'stop_01',
        title: "Thurston's Lobster Pound",
        coordinates: [44.2595, -68.3988],
        audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        image: 'https://placehold.co/400x300?text=Thurston',
        transcript: 'Welcome to Thurston’s Lobster Pound...',
      },
      {
        id: 'stop_02',
        title: "Beal's Lobster Pier",
        coordinates: [44.2807, -68.3252],
        audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
        image: 'https://placehold.co/400x300?text=Beal',
        transcript: "You're now at Beal’s Pier...",
      },
    ],
  },
];
