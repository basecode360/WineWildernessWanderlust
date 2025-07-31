export interface Stop {
  id: string;
  type: 'info' | 'lobster_roll';
  title: string;
  coordinates: [number, number];
  audioUrl: string;
  imageUrl?: string;
  narration: string;
}

export interface Tour {
  id: string;
  title: string;
  description: string;
  introCoords: [number, number];
  outroCoords: [number, number];
  price: number;
  stops: Stop[];
}

export const tours: Tour[] = [
  {
    id: 'tour_acadia_lobster_roll',
    title: 'Acadia Lobster Roll Tour',
    description:
      "Welcome to your self-guided lobster roll tour near Acadia National Park. Follow along and you'll hear the story behind Bar Island, stop for your first lobster roll, learn about Maine’s blueberry history, and more!",
    price: 5.99,
    introCoords: [44.38756, -68.20429],
    outroCoords: [44.38971, -68.20452],
    stops: [
      {
        id: 'info_1_bar_island',
        type: 'info',
        title: 'Bar Island – A Walk Across the Ocean Floor',
        coordinates: [44.39382, -68.22143],
        audioUrl:
          'https://firebasestorage.googleapis.com/v0/b/…/o/info_1_bar_island.mp3?alt=media',
        imageUrl: '@/assets/images/abels-lobster-wanderguide.jpg',
        narration:
          'As you drive out of Bar Harbor, look off to your right—that’s Bar Island, one of the few places you can walk to across the ocean floor at low tide…',
      },
      {
        id: 'lobster_1_bar_harbor',
        type: 'lobster_roll',
        title: 'Bar Harbor Lobster Pound',
        coordinates: [44.43057, -68.27156],
        audioUrl:
          'https://firebasestorage.googleapis.com/v0/b/…/o/info_1_bar_harbor.mp3?alt=media',
        imageUrl: '@/assets/images/acadia-national-park-wanderguide.jpg',
        narration:
          'Get excited—your first lobster roll stop is coming up… Bar Harbor Lobster Pound opened its doors in 2023 to rave reviews…',
      },
      {
        id: 'info_2_blueberries',
        type: 'info',
        title: 'Blueberries in Maine',
        coordinates: [44.41348, -68.29578],
        audioUrl:
          'https://firebasestorage.googleapis.com/v0/b/…/o/info_2_blueberries.mp3?alt=media',
        imageUrl: '@/assets/images/atlantic-brewing-wanderguide.jpg',
        narration:
          'Before we stopped at Bar Harbor Lobster Pound, I mentioned how Maine and blueberries go hand in hand…',
      },
      {
        id: 'info_3_lobster_ind',
        type: 'info',
        title: 'The Lobster Industry',
        coordinates: [44.39315, -68.29358],
        audioUrl:
          'https://firebasestorage.googleapis.com/v0/b/…/o/info_3_lobster_ind.mp3?alt=media',
        imageUrl: '@/assets/images/bar-harbor-lobster-pound-wanderguide.png',
        narration:
          'Believe it or not, lobster used to be considered trash food… until New Englanders discovered how delicious a fresh roll could be…',
      },
      {
        id: 'lobster_2_abels',
        type: 'lobster_roll',
        title: 'Abel’s Lobster',
        coordinates: [44.35726, -68.3062],
        audioUrl:
          'https://firebasestorage.googleapis.com/v0/b/…/o/lobster_2_abels.mp3?alt=media',
        imageUrl: '@/assets/images/bar-island-hiking-wanderguide.jpg',
        narration:
          'Now we’re heading to Abel’s Lobster, located right on Somes Sound—locals say it has the fluffiest, most buttery rolls in the county…',
      },
      {
        id: 'info_4_acadia_hist',
        type: 'info',
        title: 'Creation of Acadia National Park',
        coordinates: [44.36925, -68.33092],
        audioUrl:
          'https://firebasestorage.googleapis.com/v0/b/…/o/info_4_acadia_hist.mp3?alt=media',
        imageUrl: '@/assets/images/downtown-bar-harbor-wanderguide.jpg',
        narration:
          'Acadia was the first national park east of the Mississippi—learn how John D. Rockefeller Jr. helped preserve these majestic cliffs…',
      },
      {
        id: 'info_5_atlantic_brew',
        type: 'info',
        title: 'Atlantic Brewing Company',
        coordinates: [44.39728, -68.33431],
        audioUrl:
          'https://firebasestorage.googleapis.com/v0/b/…/o/info_5_atlantic_brew.mp3?alt=media',
        imageUrl: '@/assets/images/Lobster Roll Tour Acadia.png',
        narration:
          'Coming up on your right is Atlantic Brewing Company—one of the area’s most well-known local breweries…',
      },
      {
        id: 'lobster_3_travelin',
        type: 'lobster_roll',
        title: 'The Travelin’ Lobster',
        coordinates: [44.40902, -68.35176],
        audioUrl:
          'https://firebasestorage.googleapis.com/v0/b/…/o/info_1_bar_island.mp3?alt=media',
        imageUrl: '@/assets/images/lobster-ice-cream-wanderguide.jpg',
        narration:
          'Next up is The Travelin’ Lobster—a casual roadside shack that’s packed in the summer and famous for its secret seasoning…',
      },
      {
        id: 'info_6_mdi_life',
        type: 'info',
        title: 'Life on Mount Desert Island',
        coordinates: [44.41872, -68.3613],
        audioUrl:
          'https://firebasestorage.googleapis.com/v0/b/…/o/info_6_mdi_life.mp3?alt=media',
        imageUrl: '@/assets/images/lobster-industry-maine-wanderguide.jpg',
        narration:
          'As we head back toward Bar Harbor, let’s talk about Mount Desert Island—the heart of this whole experience…',
      },
      {
        id: 'info_7_salisbury',
        type: 'info',
        title: 'Salisbury Cove – The Quiet Side of the Island',
        coordinates: [44.4352, -68.30597],
        audioUrl:
          'https://firebasestorage.googleapis.com/v0/b/…/o/info_7_salisbury.mp3?alt=media',
        imageUrl: '@/assets/images/maine-blueberries.jpg',
        narration:
          'While most people flock downtown, Salisbury Cove is more laid back—a perfect spot for a peaceful pause…',
      },
      {
        id: 'info_8_pirates_golf',
        type: 'info',
        title: 'Pirate’s Cove Mini Golf',
        coordinates: [44.42903, -68.28244],
        audioUrl:
          'https://firebasestorage.googleapis.com/v0/b/…/o/info_8_pirates_golf.mp3?alt=media',
        imageUrl: '@/assets/images/mount-desert-island-wanderguide.jpg',
        narration:
          'If you’re traveling with kids—or just want to channel your inner child—it’s a fun and quirky way to spend an hour…',
      },
      {
        id: 'info_9_drive_back',
        type: 'info',
        title: 'Drive Back to Bar Harbor',
        coordinates: [44.41128, -68.24947],
        audioUrl:
          'https://firebasestorage.googleapis.com/v0/b/…/o/info_9_drive_back.mp3?alt=media',
        imageUrl: '@/assets/images/outdoor-acadia-wanderguide.jpg',
        narration:
          'As we get closer to downtown Bar Harbor, here are a few fun facts and extra tips to round out your Acadia adventure…',
      },
      {
        id: 'bonus_lobster_ice',
        type: 'lobster_roll',
        title: 'Lobster Ice Cream (Ben & Bill’s)',
        coordinates: [44.38934, -68.21562],
        audioUrl:
          'https://firebasestorage.googleapis.com/v0/b/…/o/bonus_lobster_ice.mp3?alt=media',
        imageUrl: '@/assets/images/pirates-cove-wanderguide.jpg',
        narration:
          'If you’re feeling brave, head to Ben & Bill’s Chocolate Emporium in downtown Bar Harbor and try their lobster ice cream…',
      },
    ],
  },
];
