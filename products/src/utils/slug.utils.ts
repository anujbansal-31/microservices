import slugify from 'slugify';

import { PrismaService } from '../prisma/prisma.service';

export class SlugUtils {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a unique slug for a product
   * @param title - Product title
   * @returns Unique slug
   */
  async generateUniqueSlug(title: string): Promise<string> {
    // Generate the initial slug from the title
    let slug = slugify(title, { lower: true, strict: true });

    // Check if the slug already exists in the database
    let existingProduct = await this.prisma.products.findUnique({
      where: { slug },
    });

    // If it exists, append a unique identifier
    while (existingProduct) {
      const uniqueSuffix = Math.random().toString(36).substring(2, 8); // Generates a random string
      slug = `${slug}-${uniqueSuffix}`;

      // Check the modified slug again
      existingProduct = await this.prisma.products.findUnique({
        where: { slug },
      });
    }

    return slug;
  }
}
