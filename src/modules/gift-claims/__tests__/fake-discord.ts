import { ChannelType } from "discord.js";

export class RoleCache extends Map<string, { id: string }> {
  some(fn: (v: { id: string }) => boolean): boolean {
    for (const v of this.values()) if (fn(v)) return true;
    return false;
  }
}

export class FakeMessage {
  readonly edits: any[] = [];
  constructor(
    readonly id: string,
    readonly payload: any,
    private readonly owner: FakeChannel,
  ) {}

  async edit(payload: any): Promise<void> {
    this.edits.push(payload);
  }

  async delete(): Promise<void> {
    this.owner.store.delete(this.id);
  }
}

let counter = 0;

export class FakeChannel {
  readonly store = new Map<string, FakeMessage>();
  readonly type: ChannelType;
  overwrites: any[] = [];
  parentId: string | null = null;

  constructor(
    readonly id: string,
    private readonly world: FakeWorld,
    type: ChannelType = ChannelType.GuildText,
  ) {
    this.type = type;
  }

  get sent(): FakeMessage[] {
    return [...this.store.values()];
  }

  isTextBased(): boolean {
    return true;
  }

  async send(payload: any): Promise<FakeMessage> {
    counter += 1;
    const message = new FakeMessage(`${this.id}-m${counter}`, payload, this);
    this.store.set(message.id, message);
    return message;
  }

  messages = {
    fetch: async (id: string) => {
      const message = this.store.get(id);
      if (!message) throw new Error("Unknown Message");
      return message;
    },
  };

  async delete(): Promise<void> {
    this.world.channels.delete(this.id);
  }
}

export interface FakeMember {
  id: string;
  guild: any;
  user: { id: string; bot: boolean };
  roles: { cache: RoleCache };
  permissions: { has: () => boolean };
}

export class FakeWorld {
  readonly channels = new Map<string, FakeChannel>();
  readonly members = new Map<string, FakeMember>();
  readonly closedDms = new Set<string>();
  readonly dms = new Map<string, FakeChannel>();
  readonly guild: any;
  readonly client: any;

  constructor(
    readonly guildId: string,
    readonly categoryIds: string[],
    roleIds: string[],
  ) {
    const roles = new RoleCache(roleIds.map((id) => [id, { id }]));
    this.guild = {
      id: guildId,
      roles: { cache: roles, everyone: { id: guildId } },
      members: {
        me: { id: "bot" },
        fetch: async (arg: unknown) => {
          const id = typeof arg === "string" ? arg : (arg as { user: string }).user;
          const member = this.members.get(id);
          if (!member) throw new Error("Unknown Member");
          return member;
        },
      },
      channels: {
        fetch: async (id: string) => {
          if (this.categoryIds.includes(id)) return { id, type: ChannelType.GuildCategory };
          const channel = this.channels.get(id);
          if (!channel) throw new Error("Unknown Channel");
          return channel;
        },
        create: async (options: any) => {
          counter += 1;
          const channel = new FakeChannel(`created-${counter}`, this);
          channel.overwrites = options.permissionOverwrites ?? [];
          channel.parentId = options.parent ?? null;
          this.channels.set(channel.id, channel);
          return channel;
        },
      },
      client: { user: { id: "bot" } },
    };
    this.client = {
      guilds: { cache: new Map([[guildId, this.guild]]), fetch: async () => this.guild },
      channels: {
        fetch: async (id: string) => {
          const channel = this.channels.get(id);
          if (!channel) throw new Error("Unknown Channel");
          return channel;
        },
      },
      users: {
        fetch: async (id: string) => ({
          id,
          createDM: async () => {
            if (this.closedDms.has(id)) throw new Error("Cannot send messages to this user");
            let dm = this.dms.get(id);
            if (!dm) {
              dm = new FakeChannel(`dm-${id}`, this, ChannelType.DM);
              this.dms.set(id, dm);
              this.channels.set(dm.id, dm);
            }
            return dm;
          },
        }),
      },
    };
  }

  textChannel(id: string): FakeChannel {
    const channel = new FakeChannel(id, this);
    this.channels.set(id, channel);
    return channel;
  }

  member(id: string, roleIds: string[] = [], admin = false): FakeMember {
    const member: FakeMember = {
      id,
      guild: this.guild,
      user: { id, bot: false },
      roles: { cache: new RoleCache(roleIds.map((r) => [r, { id: r }])) },
      permissions: { has: () => admin },
    };
    this.members.set(id, member);
    return member;
  }
}
