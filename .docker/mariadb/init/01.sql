create table Category
(
    id   int auto_increment
        primary key,
    name varchar(191) not null,
    constraint `Category.name_unique`
        unique (name)
)
    collate = utf8mb4_unicode_ci;

create table Event
(
    id        int auto_increment
        primary key,
    name      varchar(191) not null,
    location  varchar(191) null,
    startTime datetime(3)  not null,
    endTime   datetime(3)  not null
)
    collate = utf8mb4_unicode_ci;

create table `Group`
(
    id             int auto_increment
        primary key,
    primaryImageId int          null,
    name           varchar(191) not null,
    constraint `Group.name_unique`
        unique (name)
)
    collate = utf8mb4_unicode_ci;

create index primaryImageId
    on `Group` (primaryImageId);

create table Location
(
    id   int auto_increment
        primary key,
    name varchar(191) not null,
    constraint `Location.name_unique`
        unique (name)
)
    collate = utf8mb4_unicode_ci;

create table PriceGroup
(
    id             int auto_increment
        primary key,
    name           varchar(191)         not null,
    regularName    varchar(191)         null,
    specialName    varchar(191)         null,
    priceTypeName  varchar(191)         null,
    canPostSpecial tinyint(1) default 0 not null,
    constraint `PriceGroup.name_unique`
        unique (name)
)
    collate = utf8mb4_unicode_ci;

create table Image
(
    id           int auto_increment
        primary key,
    name         varchar(191)    not null,
    description  text            null,
    width        int             not null,
    height       int             not null,
    exposure     decimal(65, 30) null,
    focalLength  int             null,
    aperture     decimal(65, 30) null,
    iso          int             null,
    cameraModel  varchar(191)    null,
    timeTaken    datetime(3)     null,
    locationId   int             null,
    priceGroupId int             null,
    groupId      int             null,
    constraint `Image.name_unique`
        unique (name),
    constraint Image_ibfk_1
        foreign key (locationId) references Location (id)
            on update cascade on delete set null,
    constraint Image_ibfk_2
        foreign key (priceGroupId) references PriceGroup (id)
            on update cascade on delete set null,
    constraint Image_ibfk_3
        foreign key (groupId) references `Group` (id)
            on update cascade on delete set null
)
    collate = utf8mb4_unicode_ci;

alter table `Group`
    add constraint Group_ibfk_1
        foreign key (primaryImageId) references Image (id)
            on update cascade on delete cascade;

create index groupId
    on Image (groupId);

create index locationId
    on Image (locationId);

create index priceGroupId
    on Image (priceGroupId);

create table Price
(
    id           int auto_increment
        primary key,
    name         varchar(191)    not null,
    costRegular  decimal(65, 30) not null,
    costSpecial  decimal(65, 30) null,
    costPostage  decimal(65, 30) null,
    priceGroupId int             not null,
    constraint Price_ibfk_1
        foreign key (priceGroupId) references PriceGroup (id)
            on update cascade on delete cascade
)
    collate = utf8mb4_unicode_ci;

create index priceGroupId
    on Price (priceGroupId);

create table Tag
(
    id   int auto_increment
        primary key,
    name varchar(191) not null,
    constraint `Tag.name_unique`
        unique (name)
)
    collate = utf8mb4_unicode_ci;

create table _CategoryToImage
(
    A int not null,
    B int not null,
    constraint _CategoryToImage_AB_unique
        unique (A, B),
    constraint _CategoryToImage_ibfk_1
        foreign key (A) references Category (id)
            on update cascade on delete cascade,
    constraint _CategoryToImage_ibfk_2
        foreign key (B) references Image (id)
            on update cascade on delete cascade
)
    collate = utf8mb4_unicode_ci;

create index _CategoryToImage_B_index
    on _CategoryToImage (B);

create table _ImageToTag
(
    A int not null,
    B int not null,
    constraint _ImageToTag_AB_unique
        unique (A, B),
    constraint _ImageToTag_ibfk_1
        foreign key (A) references Image (id)
            on update cascade on delete cascade,
    constraint _ImageToTag_ibfk_2
        foreign key (B) references Tag (id)
            on update cascade on delete cascade
)
    collate = utf8mb4_unicode_ci;

create index _ImageToTag_B_index
    on _ImageToTag (B);

create table _prisma_migrations
(
    id                  varchar(36)                               not null
        primary key,
    checksum            varchar(64)                               not null,
    finished_at         datetime(3)                               null,
    migration_name      varchar(255)                              not null,
    logs                text                                      null,
    rolled_back_at      datetime(3)                               null,
    started_at          datetime(3)  default current_timestamp(3) not null,
    applied_steps_count int unsigned default 0                    not null
)
    collate = utf8mb4_unicode_ci;

create table accounts
(
    id                   int auto_increment
        primary key,
    compound_id          varchar(191)                             not null,
    user_id              int                                      not null,
    provider_type        varchar(191)                             not null,
    provider_id          varchar(191)                             not null,
    provider_account_id  varchar(191)                             not null,
    refresh_token        varchar(191)                             null,
    access_token         varchar(191)                             null,
    access_token_expires datetime(3)                              null,
    created_at           datetime(3) default current_timestamp(3) not null,
    updated_at           datetime(3) default current_timestamp(3) not null,
    constraint `accounts.compound_id_unique`
        unique (compound_id)
)
    collate = utf8mb4_unicode_ci;

create index providerAccountId
    on accounts (provider_account_id);

create index providerId
    on accounts (provider_id);

create index userId
    on accounts (user_id);

create table sessions
(
    id            int auto_increment
        primary key,
    user_id       int                                      not null,
    expires       datetime(3)                              not null,
    session_token varchar(191)                             not null,
    access_token  varchar(191)                             not null,
    created_at    datetime(3) default current_timestamp(3) not null,
    updated_at    datetime(3) default current_timestamp(3) not null,
    constraint `sessions.access_token_unique`
        unique (access_token),
    constraint `sessions.session_token_unique`
        unique (session_token)
)
    collate = utf8mb4_unicode_ci;

create table users
(
    id             int auto_increment
        primary key,
    name           varchar(191)                             null,
    email          varchar(191)                             null,
    email_verified datetime(3)                              null,
    image          text                                     null,
    created_at     datetime(3) default current_timestamp(3) not null,
    updated_at     datetime(3) default current_timestamp(3) not null,
    constraint `users.email_unique`
        unique (email)
)
    collate = utf8mb4_unicode_ci;

create table verification_requests
(
    id         int auto_increment
        primary key,
    identifier varchar(191)                             not null,
    token      varchar(191)                             not null,
    expires    datetime(3)                              not null,
    created_at datetime(3) default current_timestamp(3) not null,
    updated_at datetime(3) default current_timestamp(3) not null,
    constraint `verification_requests.token_unique`
        unique (token)
)
    collate = utf8mb4_unicode_ci;

