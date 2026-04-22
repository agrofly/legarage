window.SALES_DATA = {
  brand: "LE GARAGE",
  currency: {
    locale: "es-BO",
    code: "BOB",
    decimals: 2,
    symbol: "$",
  },
  heroText:
    "Combos con descuento real, stock actualizado y atencion inmediata para cerrar ventas por redes sociales.",
  contact: {
    whatsapp: "59178463301",
    footerMessage: "Atencion por WhatsApp de lunes a sabado, 9:00 a 20:00.",
  },
  activeCatalogId: "ropa",
  catalogs: [
    {
      id: "ropa",
      name: "Ropa",
      products: [
        {
          name: "Camisa Cuadros",
          price: 39990,
          oldPrice: 49990,
          image: "assets/images/camisa_cuadros.webp",
          details: [
            "Algodon premium",
            "Talles S al XL",
            "Envio en 24 horas",
          ],
          ctaText: "Consultar talle",
          defaultAction: "consultar",
          productStatus: "activo",
        },
      ],
    },
    {
      id: "accesorios",
      name: "Accesorios",
      products: [
        {
          name: "Reloj Minimal Steel",
          price: 45990,
          oldPrice: 55990,
          image: "https://placehold.co/1200x750/png?text=Reloj+Minimal+Steel",
          details: [
            "Acero inoxidable",
            "Resistente al agua",
            "Garantia 6 meses",
          ],
          ctaText: "Comprar por WhatsApp",
          defaultAction: "comprar",
        },
      ],
    },
  ],
};
