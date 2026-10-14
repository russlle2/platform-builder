type DeploymentEnvironment = Partial<Record<string, string | undefined>>

/** Staging must stay out of search indexes even when its temporary URL is public. */
export function shouldIndexDeployment(
  env: DeploymentEnvironment = process.env,
): boolean {
  return env.DAILYCLARITY_ENVIRONMENT?.trim().toLowerCase() !== 'staging'
}
