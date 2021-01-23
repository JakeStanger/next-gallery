import { Image, Prisma } from '@prisma/client';

class ImageService {
  public static async createImage(
    saveData: Prisma.ImageCreateInput
  ): Promise<Error | Image> {
    const res = await fetch('/api/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saveData),
    });

    if (res.ok && res.status >= 200 && res.status < 300) {
      return res.json();
    } else {
      return new Error(await res.text());
    }
  }

  public static async updateImage(
    id: number,
    diff: Prisma.ImageUpdateInput
  ): Promise<Error | undefined> {
    const res = await fetch(`/api/image/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(diff),
    });

    if (!(res.ok && res.status >= 200 && res.status < 300)) {
      return new Error(await res.text());
    }
  }

  public static async deleteImage(id: number): Promise<Error | undefined> {
    const res = await fetch(`/api/image/${id}`, {
      method: 'DELETE',
    });

    if (!(res.ok && res.status >= 200 && res.status < 300)) {
      return new Error(await res.text());
    }
  }

  public static async makeGroupPrimary(
    id: number,
    groupId: number
  ): Promise<Error | undefined> {
    const res = await fetch(`/api/group/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ primaryImage: { connect: { id } } }),
    });

    if (!(res.ok && res.status >= 200 && res.status < 300)) {
      return new Error(await res.text());
    }
  }
}

export default ImageService;
