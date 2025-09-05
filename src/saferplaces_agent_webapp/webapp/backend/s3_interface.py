import boto3

_BASE_BUCKET = 'saferplaces.co'
_BASE_BUCKET_PREFIX = 'SaferPlaces-Agent/dev'

s3 = boto3.client('s3')

def list_prefixes(bucket_name, prefix):
    """List all prefixes (folders) in a given S3 bucket."""
    
    paginator = s3.get_paginator('list_objects_v2')
    response_iterator = paginator.paginate(
        Bucket=bucket_name,
        Prefix=prefix,
        Delimiter='/'
    )

    prefixes = []
    for response in response_iterator:
        if 'CommonPrefixes' in response:
            for cp in response['CommonPrefixes']:
                prefixes.append(cp['Prefix'])
    
    return prefixes


def list_files(bucket_name, prefix):
    """
    Restituisce la lista dei file contenuti sotto un certo prefix in un bucket S3.

    :param bucket_name: nome del bucket S3
    :param prefix: prefisso (es. 'prefix1/')
    :return: lista di file (chiavi S3)
    """
    s3 = boto3.client("s3")
    files = []

    # La chiamata può restituire risultati paginati
    paginator = s3.get_paginator("list_objects_v2")

    for page in paginator.paginate(Bucket=bucket_name, Prefix=prefix):
        if "Contents" in page:
            for obj in page["Contents"]:
                files.append(obj["Key"])

    return files

def read_file(bucket_name, key):
    """
    Restituisce il contenuto del file _layer_registry.json in un bucket S3.

    :param bucket_name: nome del bucket S3
    :param prefix: prefisso (es. 'prefix1/')
    :return: contenuto del file _layer_registry.json
    """
    # handle the case where the key is not found
    try:
        response = s3.get_object(Bucket=bucket_name, Key=key)
        content = response['Body'].read().decode('utf-8')
        return content
    except s3.exceptions.NoSuchKey:
        return None
    except Exception as e:
        print(f"Error reading {key} from {bucket_name}: {e}")
        return None
    
def write_file(bucket_name, key, content):
    """
    Scrive il contenuto in un file in un bucket S3.

    :param bucket_name: nome del bucket S3
    :param key: chiave del file (es. 'prefix1/file.txt')
    :param content: contenuto da scrivere nel file
    """
    try:
        s3.put_object(Bucket=bucket_name, Key=key, Body=content)
        print(f"File {key} written to {bucket_name}.")
    except Exception as e:
        print(f"Error writing {key} to {bucket_name}: {e}")