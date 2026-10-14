// Twilio redelivers a webhook it thinks timed out, possibly while the first
// delivery is still running, so each picture is claimed before it is saved
export const saveEachMediaOnce = async ({
  messageSid,
  fileNames,
  claim,
  release,
  save,
}: {
  messageSid: string;
  fileNames: string[];
  claim: (key: string) => Promise<boolean>;
  release: (key: string) => Promise<void>;
  save: (index: number) => Promise<void>;
}): Promise<string[]> => {
  for (const index of fileNames.keys()) {
    const claimKey = `twilio-mms:${messageSid}:${index}`;

    if (!(await claim(claimKey))) {
      continue;
    }

    try {
      await save(index);
    } catch (error) {
      await release(claimKey).catch(() => undefined);
      throw error;
    }
  }

  return fileNames;
};
