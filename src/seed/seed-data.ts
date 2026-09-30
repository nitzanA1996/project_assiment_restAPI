export const seedUsers = [
  {
    id: "660000000000000000000101",
    email: "demo.regular@example.com",
    first: "Demo",
    last: "Regular",
    phone: "0500000001",
    isBusiness: false,
    isAdmin: false,
  },
  {
    id: "660000000000000000000102",
    email: "demo.business@example.com",
    first: "Demo",
    last: "Business",
    phone: "0500000002",
    isBusiness: true,
    isAdmin: false,
  },
  {
    id: "660000000000000000000103",
    email: "demo.admin@example.com",
    first: "Demo",
    last: "Admin",
    phone: "0500000003",
    isBusiness: false,
    isAdmin: true,
  },
] as const;

export const seedCards = [
  {
    id: "660000000000000000000201",
    title: "Demo Bakery",
    subtitle: "Fresh bread and pastries",
    description: "A sample business card for a neighborhood bakery.",
    phone: "0500000011",
    email: "bakery@example.com",
    address: { country: "Israel", city: "Tel Aviv", street: "Herzl", houseNumber: 11 },
  },
  {
    id: "660000000000000000000202",
    title: "Demo Design Studio",
    subtitle: "Visual design services",
    description: "A sample business card for a graphic design studio.",
    phone: "0500000012",
    email: "design@example.com",
    address: { country: "Israel", city: "Haifa", street: "Hanasi", houseNumber: 12 },
  },
  {
    id: "660000000000000000000203",
    title: "Demo Flower Shop",
    subtitle: "Flowers for every occasion",
    description: "A sample business card for a local flower shop.",
    phone: "0500000013",
    email: "flowers@example.com",
    address: { country: "Israel", city: "Jerusalem", street: "Jaffa", houseNumber: 13 },
  },
] as const;

export const seedAddress = {
  country: "Israel",
  city: "Tel Aviv",
  street: "Example",
  houseNumber: 1,
} as const;
