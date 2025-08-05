// data/tours.ts - Updated Data Models for Tours and Stops with correct asset names
import { Tour } from '../types/tour';

export const sampleTourData: Tour = {
  id: 'acadia_lobster_tour',
  title: 'Acadia Lobster Roll Tour',
  description:
    "A tasty audio journey across Acadia National Park exploring the best lobster rolls in the area, while sharing local history and can't-miss stops in between.",
  price: 5.99,
  duration: '3-4 hours',
  distance: '25 miles',
  image: 'Lobster-Roll-Tour-Acadia.png',
  isPurchased: false,
  isDownloaded: false,
  stops: [
    {
      id: 'start_tour',
      title: 'Start of Tour - Bar Harbor',
      type: 'info',
      coordinates: { lat: 44.3875617, lng: -68.2042989 },
      audio: 'Intro.wav',
      transcript:
        "Welcome to your self-guided lobster roll tour near Acadia National Park, brought to you by Wine Wilderness Wanderlust. I'm Leah, and I'm here to guide you to the most delicious lobster rolls in the area---while sharing local history and can't-miss stops in between. This loop tour starts and ends right here in Bar Harbor, making it perfect for an afternoon outing or an all-day foodie tour. Along the way, you'll visit my favorite lobster shacks and enjoy some bonus tips and surprises on the drive back. If you don't have time to complete the entire tour in one day, don't worry. You can break it up over multiple days---or even weeks---depending on your schedule. Let's get rolling---lobster roll-ing, that is.",
      image: 'downtown-bar-harbor.jpg',
      isPlayed: false,
      address: 'Bar Harbor, ME',
    },
    {
      id: 'info_stop_1',
      title: 'Bar Island – A Walk Across the Ocean Floor',
      type: 'info',
      coordinates: { lat: 44.3938257, lng: -68.2214357 },
      audio: 'Info Stop 1_ Bar Island – A Walk Across the Ocean Floor.wav',
      transcript:
        "As you drive out of Bar Harbor, look off to your right---that's Bar Island, right across the water. It might not look like much at first, but it's actually one of my favorite little experiences in town. At low tide, a sandbar appears and connects the island to the mainland. You can literally walk across the ocean floor to the other side. There's a short trail on Bar Island once you reach it that leads up to a nice overlook of Bar Harbor. It's peaceful and usually not too crowded, but the real magic is in that walk across the exposed seabed. You never know what you will find along the way. Just don't lose track of time once you cross over. Some people have gotten stranded on the island and had to call a water taxi back for a hefty $150. If you do find yourself in that situation, there's a sign with the number for the water taxi. But honestly? That money's better spent on Maine lobster rolls. Which we will get to in a moment.",
      image: 'bar-island-sandbar.jpg',
      isPlayed: false,
    },
    {
      id: 'lobster_stop_1_audio',
      title: 'Bar Harbor Lobster Pound (Audio Start)',
      type: 'info',
      coordinates: { lat: 44.4297052, lng: -68.2565495 },
      audio: 'Lobster Roll Stop 1_ Bar Harbor Lobster Pound.wav',
      transcript:
        "Get excited, your first lobster roll stop is coming up, and it's one of my favorites, Bar Harbor Lobster Pound. This delicious lobster shack opened its doors in 2023 and already feels like it's been part of the local scene forever. You will see the steam rising from the lobster pots before you even get out of the car. It doesn't get more fresh than that. This place has such a laid-back vibe. You order at the counter, then head outside to one of the picnic tables. It's casual and welcoming---making it a great place to start your lobster roll journey. I have to admit that this is one of my favorite lobster rolls in Maine. I always go for their House Roll. It's fresh lobster tossed in a garlicky aioli, served with crispy homemade chips. If you're up for something different, try the lobster nachos. Yes, you heard that right---lobster nachos. They're loaded with mango salsa and cilantro, and they always hit the spot. And if you're craving something non-lobster, their fried haddock sandwich is actually amazing. Light, crispy, and honestly, underrated. Don't forget to pair your meal with some local Maine blueberry drinks. They serve blueberry wine from Bar Harbor Cellars Winery, which is five minutes up the road. Or, order an Old Soaker Blueberry Soda from Atlantic Brewing Company---another great local favorite. This is the kind of place that makes you want to stay a while. So, take your time, enjoy the food, and settle into the pace of coastal Maine. You've got more lobster ahead, but this is a pretty great way to begin.",
      image: 'bar-harbor-lobster-pound-roll.jpg',
      isPlayed: false,
    },
    {
      id: 'bar_harbor_lobster_pound',
      title: 'Bar Harbor Lobster Pound',
      type: 'lobster_stop',
      coordinates: { lat: 44.4305707, lng: -68.27156149999999 },
      triggerCoordinates: { lat: 44.4297052, lng: -68.2565495 },
      audio: 'Lobster Roll Stop 1_ Bar Harbor Lobster Pound.wav',
      transcript:
        "Get excited, your first lobster roll stop is coming up, and it's one of my favorites, Bar Harbor Lobster Pound...",
      image: 'bar-harbor-lobster-pound-roll.jpg',
      isPlayed: false,
      address: '414 ME-3, Bar Harbor, ME 04609',
      tips: "Try the House Roll with garlicky aioli and homemade chips. Don't miss the lobster nachos!",
    },
    {
      id: 'info_stop_2',
      title: 'Blueberries in Maine',
      type: 'info',
      coordinates: { lat: 44.413486, lng: -68.2957878 },
      audio: 'Info Stop 2_ Blueberries in Maine.wav',
      transcript:
        "Welcome back. I hope you enjoyed your lobster roll---and maybe even added a scoop of ice cream from the Ice Cream Boat near the entrance. Before we stopped at Bar Harbor Lobster Pound, I mentioned how Maine and blueberries go hand in hand. So while we're enjoying the drive, let me tell you why. Maine is actually the largest producer of wild blueberries in the entire country. And these aren't your average blueberries. Wild Maine blueberries are smaller, darker, and way more flavorful. They grow low to the ground in the rocky soil of Downeast Maine and have been around for thousands of years---even before Maine became a state. If you see blueberry treats on the menu anywhere in this area, it's typically made with wild Maine berries. And honestly, there's nothing more Maine than pairing a fresh lobster roll with a slice of homemade blueberry pie. Alright, now that you've had a little taste of the land to go with the sea, let's talk about the lobster industry itself.",
      image: 'wild-maine-blueberries.jpg',
      isPlayed: false,
    },
    {
      id: 'info_stop_3',
      title: 'The Lobster Industry',
      type: 'info',
      coordinates: { lat: 44.3931537, lng: -68.2935811 },
      audio: 'Info Stop 3_ The Lobster Industry.wav',
      transcript:
        "As we make our way to the next stop, here's a little background on Maine's lobster industry. Believe it or not, lobster used to be considered trash food. It was so abundant back in the day that it was fed to prisoners and servants. But over time, it transformed into the delicacy we all know and love. Talk about a glow up. Today, Maine's lobstering community is one of the oldest and most sustainable fisheries in the world. Local fishermen still use traditional traps and follow strict rules to keep the lobster population thriving. That's part of what makes a Maine lobster roll so special---it's not just fresh and delicious, it's also deeply connected to the culture and coastline here. So every time you enjoy a lobster roll, you're supporting Maine's lobstermen and the small communities that rely on the sea. And with that, I hope you're ready for our next stop.",
      image: 'fresh-lobster-dinner.jpg',
      isPlayed: false,
    },
    {
      id: 'lobster_stop_2_audio',
      title: "Abel's Lobster (Audio Start)",
      type: 'info',
      coordinates: { lat: 44.3742348, lng: -68.2962111 },
      audio: 'Lobster Roll Stop 2_ Abels Lobster.wav',
      transcript:
        "Now we're heading to Abel's Lobster, located right on Somes Sound. This spot is pure coastal Maine. You've got picnic tables overlooking the water, salty air, and relaxing energy that makes you want to hang out for a while. Abel's has been around since the 1930s and has been a part of the community for decades. They work with local fishermen and source almost everything right here in Maine, which is something I really appreciate. Their lobster roll is one of my favorites near Acadia National Park. Because they keep things classic but never boring. Their lobster roll is packed with fresh lobster meat, just a touch of mayo and chives, all tucked into a warm, buttery brioche bun. It's exactly what you hope a lobster roll will be. You have to add a side of their homemade cornbread, which is served with whipped maple butter. I also never skip on the corn on the cob and their tangy and tasty dilly beans. While you wait for your food, walk down to the small outdoor building where they prep all the lobster. It's always fun to see where the magic happens. Once you get your meal, enjoy the view and snap some photos. The view of the boats and Somes Sound is beautiful---especially in the late afternoon light. Spend some time here and really take it all in. I'll be right here when you're ready to get back on the road.",
      image: 'abels-lobster-somes-sound.jpg',
      isPlayed: false,
    },
    {
      id: 'abels_lobster',
      title: "Abel's Lobster",
      type: 'lobster_stop',
      coordinates: { lat: 44.3572662, lng: -68.3062051 },
      triggerCoordinates: { lat: 44.3742348, lng: -68.2962111 },
      audio: 'Lobster Roll Stop 2_ Abels Lobster.wav',
      transcript:
        "Now we're heading to Abel's Lobster, located right on Somes Sound...",
      image: 'abels-lobster-somes-sound.jpg',
      isPlayed: false,
      address: '13 Abels Ln, Mt Desert, ME 04660',
      tips: "Try the homemade cornbread with whipped maple butter and don't miss the dilly beans",
    },
    {
      id: 'info_stop_4',
      title: 'Creation of Acadia National Park',
      type: 'info',
      coordinates: { lat: 44.3692572, lng: -68.3309266 },
      audio: 'Info Stop 4_ Creation of Acadia National Park.wav',
      transcript:
        "Hey there, I hope you enjoyed Abel's Lobster as much as I did. While you digest that delicious lobster, here's a bit of Acadia National Park's history for you. Acadia was the first national park east of the Mississippi, and it only exists today thanks to a group of Locals and leaders who cared about the land, including John D. Rockefeller Jr. Yes, that's the same Rockefeller who helped design Rockefeller Center in New York City---the iconic holiday spot with the massive Christmas tree and ice skating rink. He played a major role in preserving the land in Acadia. and even built the famous carriage roads. Those are the beautiful, stone-lined paths you'll see people walking, biking, and horseback riding on today. They provide some of the best nature views in the entire park. And speaking of views, you might even be driving near the famous Cadillac Mountain. It's the highest point on the East Coast and one of the first places in the country to catch the sunrise. On a clear day, the view from the top stretches out over Bar Harbor, Frenchman Bay, and all the surrounding islands. If you decide to watch the sunrise here, make sure to book your reservation in advance. If you are a little too late, don't worry, last-minute cancellations are more common than you think. Just a few minutes from here is Babson Creek Preserve---a quiet, flat trail through salt marshes with gorgeous views and plenty of birds. If you're starting to feel a little full from your second lobster roll of the day, this is the perfect moment to take a break. It's short, peaceful, and a nice reset before hitting the next stop. Take a little time to stretch your legs and enjoy a different kind of coastal Maine beauty. I'll be here when you're ready to keep going.",
      image: 'acadia-mountain-vista.jpg',
      isPlayed: false,
    },
    {
      id: 'info_stop_5',
      title: 'Atlantic Brewing Company',
      type: 'info',
      coordinates: { lat: 44.397285, lng: -68.3343154 },
      audio: 'Info Stop 5_ Atlantic Brewing Company.wav',
      transcript:
        "Coming up on your right is Atlantic Brewing Company---one of the area's most well-known local breweries. If you're into craft beer or just curious to try something new, this place is worth bookmarking for later. They've been brewing right here on Mount Desert Island for decades and have a great mix of classic styles and seasonal favorites. Their Old Soaker Blueberry Soda is a fun non-alcoholic option made with wild Maine blueberries---and if you tried it back at Bar Harbor Lobster Pound, this is where it came from. The brewery has a tasting room, outdoor seating, and sometimes live music or food trucks in the summer. It's a great spot to take a break, try a flight, or pick up a few cans to bring back to your hotel or campsite. If you're spending more time in the area, you could even plan a visit here on another day---it's a nice low-key stop between hikes and lobster rolls. Speaking of lobster rolls, we will be arriving at our next stop soon.",
      image: 'atlantic-brewing-blueberry-ale.jpg',
      isPlayed: false,
      address: '15 Knox Rd, Bar Harbor, ME 04609',
    },
    {
      id: 'lobster_stop_3_audio',
      title: "The Travelin' Lobster (Audio Start)",
      type: 'info',
      coordinates: { lat: 44.4065767, lng: -68.3475368 },
      audio: 'Lobster Roll Stop 3_ The Travelin Lobster.wav',
      transcript:
        "Next up is The Travelin' Lobster---a casual roadside shack that's packed in the summer and loved by both locals and travelers. It's family-run, with roots going back to the 1970s, and the current location has been serving up fresh, boat-to-bun lobster since 2016. They only serve what's caught that morning, so the lobster here is incredibly fresh. My go-to is the Hot Roll, filled with buttery, sautéed lobster meat. But there are other options too---like the Slaw Roll, chilled with coleslaw and Thousand Island dressing. You can also grab a sampler trio to try them all, which is a solid move if you're indecisive like me. Their menu also includes lobster bisque, mac and cheese, crab rolls, and even lobster grilled cheese. Take your time here, enjoy the food, and I'll be here when you're ready to hit the road again.",
      image: 'travelin-lobster-roll.jpg',
      isPlayed: false,
    },
    {
      id: 'travelin_lobster',
      title: "The Travelin' Lobster",
      type: 'lobster_stop',
      coordinates: { lat: 44.40902799999999, lng: -68.351765 },
      triggerCoordinates: { lat: 44.4065767, lng: -68.3475368 },
      audio: 'Lobster Roll Stop 3_ The Travelin Lobster.wav',
      transcript:
        "Next up is The Travelin' Lobster---a casual roadside shack that's packed in the summer and loved by both locals and travelers...",
      image: 'travelin-lobster-roll.jpg',
      isPlayed: false,
      address: '1569 ME-102, Bar Harbor, ME 04609',
      tips: 'Try the sampler trio to taste the Hot Roll, Slaw Roll, and their other varieties',
    },
    {
      id: 'info_stop_6',
      title: 'Life on Mount Desert Island',
      type: 'info',
      coordinates: { lat: 44.4187244, lng: -68.361307 },
      audio: 'Info Stop 6_ Life on Mount Desert Island.wav',
      transcript:
        "I hope you enjoyed your final lobster roll of the day at The Travelin' Lobster. But don't worry---I still have one more treat for you in Downtown Bar Harbor before we wrap things up. As we head back toward Bar Harbor, let's take a moment to talk about Mount Desert Island---the heart of this whole experience. Bar Harbor might be the most well-known town, but the entire island has deep maritime roots. Boat building, fishing, and lobstering have been part of daily life here for centuries. And back in the 1800s, this quiet coastal escape became a summer retreat for wealthy families from New York and Boston. You can still catch glimpses of that past in the old seaside mansions, often referred to as 'Millionaires' Row.' It's the kind of place where the past feels present---where small harbors, forested hills, and quiet stretches of coastline hold onto their stories. Take in the views as we drive, and I will share a few more fun facts before our final stop.",
      image: 'mount-desert-island-harbor.jpg',
      isPlayed: false,
    },
    {
      id: 'info_stop_7',
      title: 'Salisbury Cove – The Quiet Side of the Island',
      type: 'info',
      coordinates: { lat: 44.4352004, lng: -68.3059755 },
      audio: 'Info Stop 7_ Salisbury Cove.wav',
      transcript:
        "As you pass through Salisbury Cove, you're actually driving through one of the quieter parts of Mount Desert Island. While most people flock to downtown Bar Harbor or the park's major trailheads, Salisbury Cove is more laid back---with cottages tucked in the trees, family-run inns, and peaceful access to the bay. This is a great spot for kayaking if you're staying longer---paddling through the cove gives you a totally different view of the island, and you'll often spot seals or seabirds along the shore. It's a stretch a lot of visitors pass right through, but if you like those slower, hidden corners of a destination, this one's worth coming back to.",
      image: 'salisbury-cove-quiet-side.jpg',
      isPlayed: false,
    },
    {
      id: 'info_stop_8',
      title: "Pirate's Cove Mini Golf",
      type: 'info',
      coordinates: { lat: 44.4290384, lng: -68.2824463 },
      audio: 'Info Stop 8_ Pirates Cove Mini Golf.wav',
      transcript:
        "Coming up on your right is Pirate's Cove Mini Golf, a local landmark that's been around for years. If you're traveling with kids---or just want to channel your inner child---it's a fun and quirky way to spend an hour. The course is pirate-themed (of course), and the whole setup feels very vintage Maine. Wooden bridges, caves, waterfalls, and yes---pirate ships. It's one of those nostalgic roadside attractions that somehow fits perfectly between lobster rolls and ocean views. It's also right around here where traffic usually starts to slow down a bit as you approach Hulls Cove and the downtown area---so it's a good time to take a breath and enjoy the scenery. You can definitely stop here if you want to add in some fun before your final surprise stop.",
      image: 'pirates-cove-mini-golf.jpg',
      isPlayed: false,
    },
    {
      id: 'info_stop_9',
      title: 'Drive Back to Bar Harbor',
      type: 'info',
      coordinates: { lat: 44.4112874, lng: -68.2494744 },
      audio: 'Info Stop 9_ Drive Back to Bar Harbor.wav',
      transcript:
        "As we get closer to downtown Bar Harbor, here are a few fun facts and extra tips to round out your Acadia adventure. Did you know that Maine produces 90% of the U.S. lobster supply? That's nearly 100 million pounds of lobster each year. The cold, clean waters off the coast make it the perfect habitat for sweet, tender lobster meat---and the reason your rolls today were so good. Also, Bar Harbor wasn't always spelled that way. It used to be 'Barre Harbor,' but the spelling was simplified over time. The town got its name from the natural sandbar that connects Bar Island to the mainland, which you can walk across at low tide. Just be sure to make it back before the water rises---unless you're up for a surprise swim. And if you're sticking around tomorrow, check out a few lesser-known hikes like the Ship Harbor Trail or the Beech Mountain Fire Tower. They offer stunning views with fewer crowds. Or book a sunset cruise from Bar Harbor for one last peaceful moment out on the water.",
      image: 'acadia-coastal-scenery.jpg',
      isPlayed: false,
    },
    {
      id: 'lobster_ice_cream_audio',
      title: 'Lobster Ice Cream Audio Start',
      type: 'info',
      coordinates: { lat: 44.3893404, lng: -68.2156241 },
      audio: 'Bonus Stop_ Lobster Ice Cream.wav',
      transcript:
        "Okay, before we officially wrap things up, I've got one last stop for you---and it's definitely the most unexpected treat of the day. If you're feeling brave, head to Ben & Bill's Chocolate Emporium in downtown Bar Harbor and try their lobster ice cream. Yep, you heard that right. It's real lobster---folded into a rich vanilla base. Sweet, buttery, and totally unforgettable. If lobster in your dessert isn't your thing, don't worry. They've got dozens of other flavors to choose from. But if you're up for it, trying the lobster ice cream makes for a great story---and maybe even a new favorite treat. Go ahead and grab your scoop, and I'll be here to wrap things up when you're done.",
      image: 'ben-bills-lobster-ice-cream.jpg',
      isPlayed: false,
    },
    {
      id: 'ben_bills_bonus',
      title: "Ben & Bill's Chocolate Emporium - Lobster Ice Cream",
      type: 'bonus_stop',
      coordinates: { lat: 44.3897162, lng: -68.2045227 },
      triggerCoordinates: { lat: 44.3893404, lng: -68.2156241 },
      audio: 'Outro.wav',
      transcript:
        "Alright, let's be honest---how was the lobster ice cream? Weirdly good? Just weird? Either way, you can officially say you've had one of the most iconic (and unexpected) treats in Maine. And just like that, you've reached the end of your Acadia Lobster Roll Tour! I hope you found a few new favorites---and maybe even surprised yourself by trying something totally unexpected. For more adventures, foodie finds, and outdoor escapes, head over to WineWildernessWanderlust.com. And if you're planning to explore more of Acadia National Park, be sure to check out my other self-guided tours here on Wander Guide. As a Maine local, I'm always out looking for the most fun, scenic, and delicious things this state has to offer---and I'd love to share it all with you. Thanks for riding along, and until next time---happy eating!",
      image: 'ben-bills-lobster-ice-cream.jpg',
      isPlayed: false,
      address: '66 Main St, Bar Harbor, ME 04609',
      tips: "Try the famous lobster ice cream - it's surprisingly delicious!",
    },
  ],
};

// Utility functions for tour data
export const getTourById = (id: string): Tour | null => {
  // In a real app, this would fetch from a database or API
  return id === 'acadia_lobster_tour' ? sampleTourData : null;
};

export const getAllTours = (): Tour[] => {
  // In a real app, this would return multiple tours
  return [sampleTourData];
};

export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};
