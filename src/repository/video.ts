import * as dynamoose from 'dynamoose'
import { ConditionInitializer } from 'dynamoose/dist/Condition'
import { AnyItem } from 'dynamoose/dist/Item'
import { Query, Scan } from 'dynamoose/dist/ItemRetriever'
import { omit } from 'ramda'
import { DYNAMO_MODEL_OPTIONS, IRepository, mapTo } from '.'
import { VideoState, YtVideo, videoStates } from '../types/youtube'

export function videoRepository() {
  const videoSchema = new dynamoose.Schema(
    {
      // ID of the video
      id: {
        type: String,
        rangeKey: true,
      },

      // Channel ID of the associated video
      channelId: {
        type: String,
        hashKey: true,
      },

      // Video's url
      url: String,

      // Video's title
      title: String,

      // Video's description
      description: String,

      // Video's playlist ID
      playlistId: String,

      resourceId: String,

      viewCount: Number,

      thumbnails: {
        type: Object,
        schema: {
          default: String,
          medium: String,
          high: String,
          maxRes: String,
          standard: String,
        },
      },

      //
      state: {
        type: String,
        enum: videoStates,
        index: {
          type: 'global',
          rangeKey: 'updatedAt',
          name: 'state-updatedAt-index',
        },
      },

      // Joystream video category to be assigned to synced videos
      category: String,

      // language of the synced video (derived from corresponding Joystream channel)
      languageIso: String,

      // video duration in seconds
      duration: Number,

      // The status of the uploaded video on Youtube.
      uploadStatus: String,

      // The privacy status of the youtube
      privacyStatus: String,

      // License of the youtube video
      license: String,

      // Video's container
      container: String,

      // Indicates if the video is an upcoming/active live broadcast. else it's "none"
      liveBroadcastContent: String,

      // joystream video ID in `VideoCreated` event response, returned from joystream runtime after creating a video
      joystreamVideo: {
        type: Object,

        schema: {
          // Joystream runtime Video ID for successfully synced video
          id: String,

          // Data Object IDs (first element is the video, the second is the thumbnail)
          assetIds: {
            type: Array,
            schema: [String],
          },
        },
      },

      // ID of the corresponding Joystream Channel (De-normalized from Channel table)
      joystreamChannelId: Number,

      // Video creation date on youtube
      publishedAt: String,
    },
    {
      saveUnknown: false,
      timestamps: {
        createdAt: {
          createdAt: {
            type: {
              value: Date,
              settings: {
                storage: 'iso',
              },
            },
          },
        },
        updatedAt: {
          updatedAt: {
            type: {
              value: Date,
              settings: {
                storage: 'iso',
              },
            },
          },
        },
      },
    }
  )
  return dynamoose.model('videos', videoSchema, DYNAMO_MODEL_OPTIONS)
}

export class VideosRepository implements IRepository<YtVideo> {
  private model
  constructor() {
    this.model = videoRepository()
  }

  async getModel() {
    return this.model
  }

  async upsertAll(videos: YtVideo[]): Promise<YtVideo[]> {
    const results = await Promise.all(videos.map(async (video) => await this.save(video)))
    return results
  }

  async scan(init: ConditionInitializer, f: (q: Scan<AnyItem>) => Scan<AnyItem>): Promise<YtVideo[]> {
    const results = await f(this.model.scan(init)).exec()
    return results.map((r) => mapTo<YtVideo>(r))
  }

  /**
   *
   * @param partition channel id to get videos for
   * @param id ID of the video
   * @returns
   */
  async get(channelId: string, id: string): Promise<YtVideo | undefined> {
    const result = await this.model.get({ channelId, id })
    return result ? mapTo<YtVideo>(result) : undefined
  }

  async save(model: YtVideo): Promise<YtVideo> {
    const upd = omit(['id', 'channelId', 'updatedAt'], model)
    const result = await this.model.update({ channelId: model.channelId, id: model.id }, upd)
    return mapTo<YtVideo>(result)
  }

  async delete(partition: string, id: string): Promise<void> {
    await this.model.delete({ id, channelId: partition })
    return
  }

  async query(init: ConditionInitializer, f: (q: Query<AnyItem>) => Query<AnyItem>): Promise<YtVideo[]> {
    const results = await f(this.model.query(init)).exec()
    return results.map((r) => mapTo<YtVideo>(r))
  }

  async count(init: ConditionInitializer, f: (q: Query<AnyItem>) => Query<AnyItem>): Promise<YtVideo[]> {
    const results = await f(this.model.query(init)).exec()
    return results.map((r) => mapTo<YtVideo>(r))
  }
}

export class VideosService {
  constructor(private videosRepository: VideosRepository) {}

  /**
   * @param video
   * @returns Updated video
   */
  async updateState(video: YtVideo, state: VideoState): Promise<YtVideo> {
    return await this.videosRepository.save({ ...video, state })
  }

  async getCountByChannel(channelId: string) {
    const videosCountByChannel = (await (await this.videosRepository.getModel())
      .query('channelId')
      .eq(channelId)
      .count()
      .exec()) as unknown as { count: string }

    return parseInt(videosCountByChannel.count)
  }

  async getVideosInState(state: VideoState): Promise<YtVideo[]> {
    return this.videosRepository.query({ state }, (q) => q.sort('ascending').using('state-updatedAt-index'))
  }

  async getAllUnsyncedVideos(): Promise<YtVideo[]> {
    return [
      // Only sync a video if
      // 1. it's a public video
      // 2. if it has finished processing on Youtube
      // 3. it's not a live stream/broadcast
      ...(await this.videosRepository.query({ state: 'New' }, (q) =>
        q
          .filter('privacyStatus')
          .eq('public')
          .filter('uploadStatus')
          .eq('processed')
          .filter('liveBroadcastContent')
          .eq('none')
          .sort('ascending')
          .using('state-updatedAt-index')
      )),
      ...(await this.getVideosInState('VideoCreationFailed')),
      ...(await this.getVideosInState('UploadFailed')),
    ]
  }

  async getAllVideosInPendingUploadState(limit: number): Promise<YtVideo[]> {
    // only handle upload for videos that has been created or upload failed previously
    return [...(await this.getVideosInState('UploadFailed')), ...(await this.getVideosInState('VideoCreated'))].slice(
      0,
      limit
    )
  }

  /**
   *
   * @param video
   * @returns Updated video
   */
  async save(video: YtVideo): Promise<YtVideo> {
    return await this.videosRepository.save(video)
  }
}