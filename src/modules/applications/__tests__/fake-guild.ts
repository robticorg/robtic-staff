import { ChannelType } from "discord.js";

export class RoleCache extends Map<string, { id: string; name: string }> {
  some(fn: (v: { id: string }) => boolean): boolean {
    for (const v of this.values()) if (fn(v)) return true;
    return false;
  }
}

export interface SentMessage {
  id: string;
  payload: any;
  edits: any[];
}

export class FakeChannel {
  readonly type = ChannelType.GuildText;
  readonly sent: SentMessage[] = [];
  readonly overwrites = new Map<string, any>();
  readonly createdWith: any[];
  deleted = false;

  constructor(
    readonly id: string,
    createdWith: any[] = [],
  ) {
    this.createdWith = createdWith;
    for (const overwrite of createdWith) this.overwrites.set(overwrite.id, overwrite);
  }

  isTextBased(): boolean {
    return true;
  }

  isThread(): boolean {
    return false;
  }

  async send(payload: any): Promise<SentMessage & { edit: (p: any) => Promise<void> }> {
    const message: SentMessage = { id: `${this.id}-m${this.sent.length}`, payload, edits: [] };
    this.sent.push(message);
    return { ...message, edit: async (p: any) => void message.edits.push(p) };
  }

  messages = {
    fetch: async (id: string) => {
      const message = this.sent.find((m) => m.id === id);
      if (!message) throw new Error("Unknown Message");
      return { id, edit: async (p: any) => void message.edits.push(p) };
    },
  };

  permissionOverwrites = {
    edit: async (id: string, perms: any) => {
      this.overwrites.set(id, { id, ...perms });
    },
    delete: async (id: string) => {
      this.overwrites.delete(id);
    },
  };

  async delete(): Promise<void> {
    this.deleted = true;
  }
}

export interface FakeMember {
  id: string;
  guild: FakeGuild;
  user: { id: string; bot: boolean; primaryGuild: null };
  displayName: string;
  joinedAt: Date;
  client: FakeGuild["client"];
  roles: { cache: RoleCache; add: (ids: unknown) => Promise<void>; remove: (ids: unknown) => Promise<void> };
  permissions: { has: () => boolean };
}

export interface FakeGuild {
  id: string;
  roles: { cache: RoleCache; everyone: { id: string }; fetch: (id: string) => Promise<unknown> };
  members: {
    me: any;
    cache: Map<string, FakeMember>;
    fetch: (arg: unknown) => Promise<FakeMember>;
  };
  channels: {
    byId: Map<string, FakeChannel>;
    fetch: (id: string) => Promise<unknown>;
    create: (options: any) => Promise<FakeChannel>;
  };
  client: { user: { id: string }; fetchInvite: (code: string) => Promise<never> };
}

let channelCounter = 0;

export function makeGuild(id: string, categoryIds: readonly string[], roleIds: readonly string[]): FakeGuild {
  const roles = new RoleCache(roleIds.map((r) => [r, { id: r, name: r }]));
  const members = new Map<string, FakeMember>();
  const channels = new Map<string, FakeChannel>();

  const guild: FakeGuild = {
    id,
    roles: { cache: roles, everyone: { id }, fetch: async (rid) => roles.get(rid) ?? null },
    members: {
      me: {
        id: "bot",
        roles: { highest: { comparePositionTo: () => 1 } },
        permissions: { has: () => true },
      },
      cache: members,
      fetch: async (arg) => {
        const userId = typeof arg === "string" ? arg : (arg as { user: string }).user;
        const member = members.get(userId);
        if (!member) throw new Error("Unknown Member");
        return member;
      },
    },
    channels: {
      byId: channels,
      fetch: async (cid) => {
        if (categoryIds.includes(cid)) return { id: cid, type: ChannelType.GuildCategory };
        return channels.get(cid) ?? new FakeChannel(cid);
      },
      create: async (options) => {
        channelCounter += 1;
        const channel = new FakeChannel(`${id}-ch${channelCounter}`, options.permissionOverwrites ?? []);
        channels.set(channel.id, channel);
        return channel;
      },
    },
    client: {
      user: { id: "bot" },
      fetchInvite: async () => {
        throw new Error("Unknown Invite");
      },
    },
  };
  return guild;
}

export function addMember(
  guild: FakeGuild,
  id: string,
  roleIds: readonly string[] = [],
  options: { admin?: boolean; joinedAt?: Date } = {},
): FakeMember {
  const cache = new RoleCache(roleIds.map((r) => [r, { id: r, name: r }]));
  const member: FakeMember = {
    id,
    guild,
    user: { id, bot: false, primaryGuild: null },
    displayName: id,
    joinedAt: options.joinedAt ?? new Date(Date.now() - 100 * 86_400_000),
    client: guild.client,
    roles: {
      cache,
      add: async (ids) => {
        for (const r of ([] as string[]).concat(ids as string[])) cache.set(r, { id: r, name: r });
      },
      remove: async (ids) => {
        for (const r of ([] as string[]).concat(ids as string[])) cache.delete(r);
      },
    },
    permissions: { has: () => options.admin ?? false },
  };
  guild.members.cache.set(id, member);
  return member;
}
